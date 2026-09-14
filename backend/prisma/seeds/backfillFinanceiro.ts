/**
 * Liga os lançamentos financeiros antigos ao novo modelo.
 *
 * Contexto: nota fiscal, receita e pagamento deixaram de ser filhos da
 * prestação e passaram a ser do **órgão** — a prestação apenas se apropria
 * deles. Os registros gravados antes dessa mudança têm só o `prestacaoId`, e
 * este script preenche o que falta:
 *
 * - `clienteId` em todos os três (herdado de `prestação → ajuste → cliente`);
 * - `ajusteId` em receita e pagamento, que antes só se alcançava pela prestação;
 * - a linha de `PrestacaoDocumentoFiscal` para cada nota, com o percentual do
 *   rateio que estava gravado nela.
 *
 * **Roda antes de as abas da prestação virarem seleção.** Na ordem inversa,
 * toda prestação já existente abriria vazia: os vínculos que ela passaria a
 * usar ainda não existiriam, e o usuário concluiria que perdeu o trabalho.
 *
 * **Idempotente.** Só toca no que ainda não foi preenchido, e a linha de
 * ligação usa `skipDuplicates`. Rodar duas vezes não duplica nem sobrescreve —
 * e num script que se roda em produção, poder repetir sem medo vale mais que
 * elegância.
 *
 *   npm run financeiro:backfill           # mostra o que faria
 *   npm run financeiro:backfill -- --executar
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const executar = process.argv.includes('--executar');

async function main() {
  console.log(
    executar
      ? '\nBackfill do Financeiro — GRAVANDO\n'
      : '\nBackfill do Financeiro — simulação (use --executar para gravar)\n',
  );

  /*
   * O órgão de cada prestação, numa consulta só.
   *
   * Um `update` por registro, cada um buscando o próprio ajuste, seria uma ida
   * ao banco por nota — e há órgão com milhares. Aqui o mapa é montado uma vez
   * e consultado em memória.
   */
  const prestacoes = await prisma.prestacaoContas.findMany({
    select: { id: true, ajusteId: true, ajuste: { select: { clienteId: true } } },
  });
  const porPrestacao = new Map(
    prestacoes.map((p) => [p.id, { ajusteId: p.ajusteId, clienteId: p.ajuste.clienteId }]),
  );
  console.log(`  ${prestacoes.length} prestação(ões) mapeada(s).`);

  const semOrgao = prestacoes.filter((p) => !p.ajuste.clienteId).length;
  if (semOrgao) {
    // O ajuste sem órgão é o backfill do multi-tenant que ainda não rodou.
    // Seguir daqui gravaria `clienteId: null`, que é o mesmo que não gravar —
    // e o operador ficaria achando que o passo foi feito.
    console.error(
      `\n  ${semOrgao} ajuste(s) ainda sem órgão. Rode "npm run tenant:backfill" primeiro.\n`,
    );
    process.exit(1);
  }

  // --- Documentos fiscais -------------------------------------------------
  const notas = await prisma.documentoFiscal.findMany({
    where: { prestacaoId: { not: null } },
    select: {
      id: true,
      prestacaoId: true,
      clienteId: true,
      contratoId: true,
      rateioProveniente: true,
      rateioPercentual: true,
    },
  });

  const notasSemOrgao = notas.filter((n) => !n.clienteId);
  console.log(
    `  Documentos fiscais: ${notas.length} com prestação · ${notasSemOrgao.length} sem órgão · ${notas.length} ligação(ões) a criar.`,
  );

  // --- Receitas e pagamentos ----------------------------------------------
  const receitas = await prisma.receita.findMany({
    where: { prestacaoId: { not: null }, OR: [{ clienteId: null }, { ajusteId: null }] },
    select: { id: true, prestacaoId: true },
  });
  const pagamentos = await prisma.pagamento.findMany({
    where: { prestacaoId: { not: null }, OR: [{ clienteId: null }, { ajusteId: null }] },
    select: { id: true, prestacaoId: true },
  });
  console.log(`  Receitas a completar:   ${receitas.length}`);
  console.log(`  Pagamentos a completar: ${pagamentos.length}`);

  if (!executar) {
    console.log('\n  Nada foi gravado. Repita com --executar.\n');
    return;
  }

  /*
   * Tudo numa transação.
   *
   * Metade do backfill é pior que nenhum: as notas ligadas e as receitas não
   * deixariam a prestação com parte dos blocos visíveis e parte invisível — e
   * a diferença só apareceria na hora de transmitir.
   */
  await prisma.$transaction(
    async (tx) => {
      for (const n of notas) {
        const ctx = porPrestacao.get(n.prestacaoId!);
        if (!ctx) continue;

        if (!n.clienteId) {
          await tx.documentoFiscal.update({
            where: { id: n.id },
            data: { clienteId: ctx.clienteId },
          });
        }

        await tx.prestacaoDocumentoFiscal.createMany({
          data: [
            {
              prestacaoId: n.prestacaoId!,
              documentoFiscalId: n.id,
              // O percentual gravado na nota é o que aquela prestação apropriou.
              // Sem rateio, a nota inteira é dela: 100.
              percentual: n.rateioProveniente && n.rateioPercentual != null ? n.rateioPercentual : 100,
              contratoId: n.contratoId,
            },
          ],
          skipDuplicates: true,
        });
      }

      for (const r of receitas) {
        const ctx = porPrestacao.get(r.prestacaoId!);
        if (!ctx) continue;
        await tx.receita.update({
          where: { id: r.id },
          data: { clienteId: ctx.clienteId, ajusteId: ctx.ajusteId },
        });
      }

      for (const p of pagamentos) {
        const ctx = porPrestacao.get(p.prestacaoId!);
        if (!ctx) continue;
        await tx.pagamento.update({
          where: { id: p.id },
          data: { clienteId: ctx.clienteId, ajusteId: ctx.ajusteId },
        });
      }
    },
    // Base grande leva tempo: o padrão de 5 s abortaria no meio, e o meio é
    // exatamente onde não se pode parar.
    { timeout: 120_000 },
  );

  console.log('\n  Pronto. Confira uma prestação antiga antes de seguir.\n');
}

main()
  .catch((e) => {
    console.error('\nFalhou:', e instanceof Error ? e.message : e, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

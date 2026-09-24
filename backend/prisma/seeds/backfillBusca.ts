/**
 * Preenche `buscaTexto` dos lançamentos que entraram na busca global.
 *
 * Contexto: nota fiscal, conta bancária e guia de recolhimento ganharam a
 * coluna de texto normalizado que a barra superior consulta. Ela é preenchida
 * na gravação, então **os registros anteriores nascem com ela vazia** — e
 * vazia significa invisível para a busca. O usuário digitaria o nome do credor
 * que está na tela, não acharia, e concluiria que a busca não funciona.
 *
 * `PrismaClient` puro, sem as extensions, de propósito:
 *
 * - **sem o recorte por órgão** — o backfill precisa enxergar todos os
 *   clientes, e um script roda fora de qualquer requisição;
 * - **sem a trilha de auditoria** — seriam centenas de linhas de `ALTERACAO`
 *   dizendo que um campo derivado mudou, o que afogaria a trilha de verdade.
 *
 * **Idempotente.** Recalcula e grava só quando o texto atual difere do
 * calculado, então rodar de novo depois de mudar a regra de normalização
 * corrige o que precisa e não toca no resto.
 *
 *   npm run busca:backfill              # mostra o que faria
 *   npm run busca:backfill -- --executar
 */
import { PrismaClient } from '@prisma/client';
import { normalizarTexto } from '../../src/shared/normalizar';

const prisma = new PrismaClient();
const executar = process.argv.includes('--executar');

/** Espelha os construtores de `infrastructure/database/buscaTexto.ts`. */
const texto = (...partes: (string | null | undefined)[]) =>
  normalizarTexto(partes.filter(Boolean).join(' '));

async function main(): Promise<void> {
  console.log(executar ? '--- EXECUTANDO ---' : '--- SIMULAÇÃO (use -- --executar) ---');

  // As notas: credor e descrição.
  const notas = await prisma.documentoFiscal.findMany({
    select: { id: true, credorNome: true, descricao: true, buscaTexto: true },
  });
  const notasPendentes = notas.filter((n) => texto(n.credorNome, n.descricao) !== n.buscaTexto);

  // As contas: apelido e observação.
  const contas = await prisma.contaBancaria.findMany({
    select: { id: true, apelido: true, observacao: true, buscaTexto: true },
  });
  const contasPendentes = contas.filter((c) => texto(c.apelido, c.observacao) !== c.buscaTexto);

  // As guias: o tipo (INSS, IRRF…) e a observação.
  const guias = await prisma.guiaRecolhimento.findMany({
    select: { id: true, tipo: true, observacao: true, buscaTexto: true },
  });
  const guiasPendentes = guias.filter((g) => texto(g.tipo, g.observacao) !== g.buscaTexto);

  console.log(`notas fiscais .... ${notasPendentes.length} de ${notas.length} a preencher`);
  console.log(`contas bancárias . ${contasPendentes.length} de ${contas.length} a preencher`);
  console.log(`guias ............ ${guiasPendentes.length} de ${guias.length} a preencher`);

  if (!executar) {
    console.log('\nNada gravado. Repita com `-- --executar`.');
    return;
  }

  /*
   * Uma transação por bloco, não uma para tudo.
   *
   * São atualizações independentes: se as guias falharem, não há motivo para
   * desfazer as notas que já foram. Uma transação única sobre milhares de
   * linhas também seguraria a tabela por mais tempo do que precisa.
   */
  await prisma.$transaction(
    notasPendentes.map((n) =>
      prisma.documentoFiscal.update({
        where: { id: n.id },
        data: { buscaTexto: texto(n.credorNome, n.descricao) },
      }),
    ),
  );
  await prisma.$transaction(
    contasPendentes.map((c) =>
      prisma.contaBancaria.update({
        where: { id: c.id },
        data: { buscaTexto: texto(c.apelido, c.observacao) },
      }),
    ),
  );
  await prisma.$transaction(
    guiasPendentes.map((g) =>
      prisma.guiaRecolhimento.update({
        where: { id: g.id },
        data: { buscaTexto: texto(g.tipo, g.observacao) },
      }),
    ),
  );

  console.log('\nPronto.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

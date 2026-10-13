/**
 * Dá uma ordem inicial aos planos e cronogramas já gravados.
 *
 *   npm run plano:ordem              # simula, não grava nada
 *   npm run plano:ordem -- --executar
 *
 * ## Por que ele existe
 *
 * A coluna `ordem` nasceu com `0` em tudo que já estava no banco, de propósito:
 * linha antiga cai no desempate alfabético, e nenhum plano se mexe sozinho
 * quando o código sobe. A conta era que o usuário salvasse de novo e o quadro
 * assumisse a ordem digitada.
 *
 * **Faltou uma peça nessa conta:** o formulário não tinha como reordenar. Então
 * "salve de novo" só servia a quem redigitasse as dezesseis seções. As setas
 * resolveram o caso geral; este script resolve o atalho — quem segue o modelo
 * de 16 seções recebe a ordem do plano de trabalho sem tocar em nada.
 *
 * ## O que ele faz, e o que recusa fazer
 *
 * Numera **todas** as rubricas de cada ajuste, nunca só as reconhecidas. Numerar
 * só as do modelo deixaria as demais em `0`, e `0` ordena **antes** de `1`: as
 * categorias próprias da entidade saltariam para o topo. O arranjo é: as
 * reconhecidas na ordem do modelo, as demais logo atrás, na ordem alfabética em
 * que estão hoje — que é a que o usuário está vendo agora.
 *
 * **Não toca em quem já tem ordem.** Plano salvo depois da coluna existir já
 * carrega a ordem que a pessoa escolheu, e sobrescrevê-la com o modelo seria
 * desfazer trabalho feito à mão.
 *
 * O reconhecimento é pelo **nome da categoria**, sem acento e sem caixa. Erra em
 * quem renomeou — e por isso ele é um atalho, não a regra: a ordem continua
 * sendo do usuário, e as setas continuam sendo a resposta definitiva.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const executar = process.argv.includes('--executar');

/**
 * As 16 seções do plano de trabalho, na ordem em que o documento as apresenta.
 *
 * Copiadas de `frontend/src/lib/planoPadrao.ts`. **Duplicação consciente**: o
 * backend não importa do frontend, e esta lista é uma fotografia usada uma vez
 * — se o modelo mudar amanhã, este script já terá cumprido o papel dele.
 */
const MODELO = [
  'Recursos Humanos',
  'Recursos Humanos (terceiros)',
  'Serviços Médicos',
  'Medicamentos',
  'Materiais Médico-Hospitalares',
  'Gêneros Alimentícios',
  'Combustível',
  'Outros Materiais de Consumo',
  'Outros Serviços de Terceiros',
  'Locação de Imóveis',
  'Locações Diversas',
  'Utilidades Públicas',
  'Bens e Materiais Permanentes',
  'Obras',
  'Despesas Financeiras e Bancárias',
  'Outras Despesas',
];

const normalizar = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const POSICAO = new Map(MODELO.map((c, i) => [normalizar(c), i]));

/** Posição no modelo, ou um número grande que joga a rubrica para o fim. */
const posicaoDe = (categoria: string) => POSICAO.get(normalizar(categoria)) ?? 1_000;

interface Linha {
  id: string;
  ajusteId: string;
  categoria: string | null;
  subcategoria: string | null;
  ordem: number;
}

/**
 * Numera as rubricas de um ajuste e devolve `id da linha → ordem`.
 *
 * A rubrica é o par categoria+subcategoria, e **todas as linhas dela recebem o
 * mesmo número** — são doze, uma por mês, e numerá-las uma a uma espalharia os
 * meses da mesma categoria pelo quadro.
 */
function numerar(linhas: Linha[]): Map<string, number> {
  const rubricas = new Map<string, { categoria: string; subcategoria: string }>();
  for (const l of linhas) {
    const categoria = l.categoria ?? '';
    const subcategoria = l.subcategoria ?? '';
    rubricas.set(`${categoria}\u0000${subcategoria}`, { categoria, subcategoria });
  }

  const ordenadas = [...rubricas.entries()].sort(([, a], [, b]) => {
    const pa = posicaoDe(a.categoria);
    const pb = posicaoDe(b.categoria);
    if (pa !== pb) return pa - pb;
    // Dentro da mesma categoria — e entre as não reconhecidas — vale a ordem
    // alfabética, que é exatamente a que o usuário está vendo hoje. Trocá-la
    // por outra seria mexer sem motivo no que ele já conhece.
    return (
      a.categoria.localeCompare(b.categoria, 'pt-BR') ||
      a.subcategoria.localeCompare(b.subcategoria, 'pt-BR')
    );
  });

  const numeroDe = new Map(ordenadas.map(([chave], i) => [chave, i + 1]));
  const porLinha = new Map<string, number>();
  for (const l of linhas) {
    porLinha.set(l.id, numeroDe.get(`${l.categoria ?? ''}\u0000${l.subcategoria ?? ''}`)!);
  }
  return porLinha;
}

async function tratar(nome: 'planoAplicacaoItem' | 'cronogramaDesembolsoItem', rotulo: string) {
  const delegate = prisma[nome] as unknown as {
    findMany: (a: unknown) => Promise<Linha[]>;
    update: (a: unknown) => Promise<unknown>;
  };

  const todas = await delegate.findMany({
    select: { id: true, ajusteId: true, categoria: true, subcategoria: true, ordem: true },
  });

  const porAjuste = new Map<string, Linha[]>();
  for (const l of todas) {
    if (!porAjuste.has(l.ajusteId)) porAjuste.set(l.ajusteId, []);
    porAjuste.get(l.ajusteId)!.push(l);
  }

  let ajustesTratados = 0;
  let ajustesPulados = 0;
  let linhasAlteradas = 0;

  for (const [ajusteId, linhas] of porAjuste) {
    // Ajuste em que alguém já escolheu a ordem fica como está.
    if (linhas.some((l) => l.ordem > 0)) {
      ajustesPulados++;
      continue;
    }

    const numeros = numerar(linhas);
    ajustesTratados++;

    for (const l of linhas) {
      const ordem = numeros.get(l.id)!;
      if (ordem === l.ordem) continue;
      linhasAlteradas++;
      if (executar) await delegate.update({ where: { id: l.id }, data: { ordem } });
    }

    if (ajustesTratados <= 3) {
      const amostra = [...new Set(linhas.map((l) => l.categoria))]
        .sort((a, b) => posicaoDe(a ?? '') - posicaoDe(b ?? ''))
        .slice(0, 5)
        .join(' · ');
      console.log(`    ${ajusteId.slice(0, 8)}… → ${amostra}`);
    }
  }

  console.log(
    `  ${rotulo}: ${ajustesTratados} ajuste(s) numerado(s), ${ajustesPulados} já com ordem, ` +
      `${linhasAlteradas} linha(s) ${executar ? 'gravadas' : 'a gravar'}.`,
  );
}

async function main() {
  console.log(
    executar
      ? '\nOrdem inicial do Plano e do Cronograma — GRAVANDO\n'
      : '\nOrdem inicial do Plano e do Cronograma — SIMULAÇÃO (use -- --executar para gravar)\n',
  );

  await tratar('planoAplicacaoItem', 'Plano de Aplicação');
  await tratar('cronogramaDesembolsoItem', 'Cronograma de Desembolso');

  console.log(
    executar
      ? '\nPronto. Quem quiser outra ordem usa as setas na tela do Plano.\n'
      : '\nNada foi gravado.\n',
  );
}

main()
  .catch((e) => {
    console.error('\nFalhou:', e instanceof Error ? e.message : e, '\n');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

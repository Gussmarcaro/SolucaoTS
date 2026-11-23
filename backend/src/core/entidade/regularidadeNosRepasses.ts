/**
 * A entidade estava regular **no dia em que o dinheiro saiu**?
 *
 * ## Por que a pergunta é esta, e não "está regular hoje"
 *
 * A regularidade fiscal da beneficiária tem de ser verificada **antes de cada
 * parcela**, e a verificação tem de ficar documentada — é condição de liberação,
 * não formalidade de abertura. Quem libera parcela com certidão vencida responde
 * pelo valor liberado, pessoalmente: é o risco mais caro que o nosso usuário
 * corre, e o único de toda a prestação que recai sobre ele e não sobre a
 * entidade.
 *
 * A tela de Regularidade Fiscal já guarda as certidões com data de vencimento.
 * O que faltava era cruzá-las com as datas de repasse — ninguém faz essa conta à
 * mão, porque exige abrir duas telas e comparar cinco datas contra N parcelas.
 *
 * ## O que esta regra se recusa a afirmar
 *
 * A aba guarda o **conjunto atual** de certidões, não o histórico: quando uma
 * vence, o usuário troca o arquivo. Logo, não há como provar por aqui a
 * cobertura de um repasse feito há oito meses, e **exigir essa prova apontaria
 * toda prestação do sistema** — que é exatamente o defeito que um painel de
 * pendências não pode ter.
 *
 * Por isso a regra olha só o que o cadastro afirma sem ambiguidade: a certidão
 * **de maior vencimento** de cada tipo. Se até ela já estava vencida na data de
 * um repasse, então não existe no cadastro nenhum documento que cubra aquele
 * dia — isso não é falta de histórico, é falta de renovação. O contrário (a
 * certidão vigente hoje) cobre por construção todo repasse passado, e nada é
 * apontado.
 *
 * Função pura: recebe as certidões e as datas, devolve o que dizer. Coberta por
 * `npm run verificar:conferencia`, sem banco.
 */

/**
 * Os cinco documentos que compõem a regularidade **fiscal e trabalhista**.
 *
 * CEBAS, Utilidade Pública e Entidade Beneficente ficam fora de propósito: são
 * títulos de **habilitação**, que qualificam a entidade para certos ajustes, e
 * não condição de liberação de parcela. Apontá-los aqui misturaria duas
 * exigências de naturezas diferentes — e cobraria CEBAS de quem não precisa
 * dele.
 */
export const REGULARIDADE_DO_REPASSE = [
  'FEDERAL',
  'ESTADUAL',
  'MUNICIPAL',
  'FGTS',
  'TRABALHISTA',
] as const;

export type TipoRegularidadeRepasse = (typeof REGULARIDADE_DO_REPASSE)[number];

const ROTULO: Record<TipoRegularidadeRepasse, string> = {
  FEDERAL: 'Federal',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
  FGTS: 'FGTS',
  TRABALHISTA: 'Trabalhista (CNDT)',
};

/** Uma certidão da beneficiária, como o cadastro a guarda. Data em 'YYYY-MM-DD'. */
export interface CertidaoDaEntidade {
  tipo: string;
  dataVencimento: string | null;
}

export interface RegularidadeNosRepasses {
  /** Quantos repasses havia para conferir. Zero = não há o que perguntar. */
  repasses: number;
  /**
   * Tipos cuja certidão de maior vencimento já estava vencida em algum repasse.
   * `repasses` é quantos deles ficaram descobertos.
   */
  vencidas: {
    tipo: TipoRegularidadeRepasse;
    vencimento: string;
    repasses: number;
    ultimoRepasse: string;
  }[];
  /**
   * Tipos sem nenhuma certidão com vencimento cadastrado.
   *
   * Certidão cadastrada **sem** data de vencimento entra aqui, e não em
   * `vencidas`: sem a data não há o que comparar, e tratá-la como cobertura
   * esconderia justamente o cadastro pela metade.
   */
  semCertidao: TipoRegularidadeRepasse[];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function conferirRegularidadeNosRepasses(
  certidoes: CertidaoDaEntidade[],
  datasRepasse: string[],
): RegularidadeNosRepasses {
  // Datas em ISO comparam como texto. Filtrar o que não é ISO evita que um
  // valor estranho vire a "maior data" e cale a regra inteira.
  const repasses = [...new Set(datasRepasse.filter((d) => ISO.test(d)))].sort();
  if (repasses.length === 0) return { repasses: 0, vencidas: [], semCertidao: [] };

  /** Para cada tipo, o vencimento mais distante que o cadastro conhece. */
  const maiorVencimento = new Map<TipoRegularidadeRepasse, string>();
  for (const c of certidoes) {
    const tipo = c.tipo as TipoRegularidadeRepasse;
    if (!REGULARIDADE_DO_REPASSE.includes(tipo)) continue;
    if (!c.dataVencimento || !ISO.test(c.dataVencimento)) continue;
    const atual = maiorVencimento.get(tipo);
    if (!atual || c.dataVencimento > atual) maiorVencimento.set(tipo, c.dataVencimento);
  }

  const vencidas: RegularidadeNosRepasses['vencidas'] = [];
  const semCertidao: TipoRegularidadeRepasse[] = [];

  for (const tipo of REGULARIDADE_DO_REPASSE) {
    const vencimento = maiorVencimento.get(tipo);
    if (!vencimento) {
      semCertidao.push(tipo);
      continue;
    }
    // Vencimento é o último dia de validade: repasse NO dia do vencimento está
    // coberto. Só descobre o que veio depois dele.
    const descobertos = repasses.filter((d) => d > vencimento);
    if (descobertos.length)
      vencidas.push({
        tipo,
        vencimento,
        repasses: descobertos.length,
        ultimoRepasse: descobertos[descobertos.length - 1],
      });
  }

  return { repasses: repasses.length, vencidas, semCertidao };
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. Sem `Date`, para não andar fuso. */
const br = (iso: string) => iso.split('-').reverse().join('/');

/**
 * As frases que a conferência mostra — no máximo duas, e nenhuma quando está
 * tudo coberto.
 *
 * Duas e não sete: uma por tipo encheria o painel de linhas quase iguais, e o
 * usuário resolve todas no mesmo lugar, de uma vez.
 */
export function explicarRegularidadeNosRepasses(r: RegularidadeNosRepasses): string[] {
  if (r.repasses === 0) return [];
  const frases: string[] = [];

  if (r.vencidas.length) {
    const lista = r.vencidas
      .map((v) => `${ROTULO[v.tipo]} (venceu em ${br(v.vencimento)})`)
      .join('; ');
    const descobertos = Math.max(...r.vencidas.map((v) => v.repasses));
    const ultimo = r.vencidas.reduce(
      (maior, v) => (v.ultimoRepasse > maior ? v.ultimoRepasse : maior),
      '',
    );
    frases.push(
      `Houve repasse com a certidão de regularidade já vencida — ${lista}. ` +
        `${descobertos === 1 ? '1 repasse' : `${descobertos} repasses`} até ${br(ultimo)} ` +
        `sem documento que comprove a regularidade na data.`,
    );
  }

  if (r.semCertidao.length) {
    const lista = r.semCertidao.map((t) => ROTULO[t]).join(', ');
    frases.push(
      r.semCertidao.length === REGULARIDADE_DO_REPASSE.length
        ? 'A beneficiária não tem nenhuma certidão de regularidade com vencimento cadastrado — ' +
            'não há como demonstrar a verificação exigida antes de cada repasse ' +
            '(aba Regularidade Fiscal da entidade).'
        : `Sem certidão com vencimento cadastrado para: ${lista} — ` +
            'não há como conferir a regularidade na data dos repasses ' +
            '(aba Regularidade Fiscal da entidade).',
    );
  }

  return frases;
}

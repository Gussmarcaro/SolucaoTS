/**
 * Rateio — método de distribuição de uma despesa entre ajustes.
 *
 * Um órgão pode ter **vários** rateios cadastrados ao mesmo tempo, cada um com
 * seu método: um pela receita, para despesa administrativa; outro por número de
 * colaboradores, para folha. O método se escolhe pela natureza da despesa, não
 * pela entidade — por isso nada aqui obriga a um método único por órgão.
 *
 * ## O que torna isto extensível
 *
 * Todo participante guarda **uma base numérica só** (`base`), e é o método que
 * diz o que ela significa: reais de receita, quantidade de colaboradores, metros
 * quadrados, horas trabalhadas. O cálculo do percentual é sempre o mesmo —
 * `base ÷ soma das bases` — então um método novo custa uma entrada em `METODOS`
 * e nenhuma mudança de schema, de cálculo ou de tela.
 */

export type MetodoRateio = 'RECEITA' | 'COLABORADORES' | 'OUTROS';

/** Como a base do participante é lida e escrita na tela. */
export type FormatoBase = 'MOEDA' | 'INTEIRO';

export interface DefinicaoMetodo {
  id: MetodoRateio;
  rotulo: string;
  /**
   * Rótulo da coluna da base no quadro. Nulo = o método não tem quadro de
   * participantes (é o caso de "Outros", cujo critério ainda não foi definido).
   */
  rotuloBase: string | null;
  formato: FormatoBase | null;
  /** Rótulo do total da base no rodapé do quadro. */
  rotuloTotal: string | null;
}

export const METODOS: DefinicaoMetodo[] = [
  {
    id: 'RECEITA',
    rotulo: 'Rateio pela Receita',
    rotuloBase: 'Receita Total',
    formato: 'MOEDA',
    rotuloTotal: 'Receita Total',
  },
  {
    id: 'COLABORADORES',
    rotulo: 'Rateio pelo Número de Colaboradores',
    rotuloBase: 'Nº de Colaboradores',
    formato: 'INTEIRO',
    rotuloTotal: 'Total de Colaboradores',
  },
  {
    id: 'OUTROS',
    rotulo: 'Outros',
    rotuloBase: null,
    formato: null,
    rotuloTotal: null,
  },
];

export const METODOS_IDS: MetodoRateio[] = METODOS.map((m) => m.id);

export const definicaoDoMetodo = (id: string): DefinicaoMetodo | undefined =>
  METODOS.find((m) => m.id === id);

/** Métodos que distribuem por um quadro de participantes. */
export const temQuadro = (id: string): boolean => !!definicaoDoMetodo(id)?.rotuloBase;

export interface ParticipanteRateio {
  id: string;
  rateioId: string;
  ajusteId: string;
  ajusteCodigo: string;
  ajusteObjeto: string;
  entidadeNome: string;
  /** Receita, nº de colaboradores… — o método diz o quê. */
  base: number;
}

export interface Rateio {
  id: string;
  titulo: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  metodo: MetodoRateio;
  /** Só para "Outros", cujo critério ainda não foi definido. */
  descricaoMetodo: string | null;
  observacoes: string | null;
  ativo: boolean;
  participantes: ParticipanteRateio[];
  criadoPor: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Casas decimais guardadas no cálculo interno.
 *
 * A tela mostra 10,00%, mas somar seis valores arredondados a duas casas dá
 * 99,99% ou 100,01% com frequência — e o usuário fica olhando para um total que
 * não fecha. O percentual **não é gravado**: é sempre recalculado das bases,
 * então a soma fecha por construção.
 */
export const CASAS_PERCENTUAL = 6;

/** Casas mostradas ao usuário — "10,00%". É nelas que o total fecha 100,00%. */
export const CASAS_EXIBIDAS = 2;

export interface LinhaCalculada {
  ajusteId: string;
  base: number;
  /** Percentual exato — `base ÷ total × 100`, com toda a precisão. */
  percentual: number;
  /**
   * Percentual **como a tela mostra**, a 2 casas, já ajustado para que as
   * parcelas somem exatamente 100,00%.
   */
  percentualExibido: number;
}

export interface ResultadoRateio {
  linhas: LinhaCalculada[];
  totalBase: number;
  /** Soma dos exibidos: 100 sempre que houver base, 0 quando não houver. */
  totalPercentual: number;
}

const arredondar = (n: number, casas: number) => {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Centésimos de por cento — 10.000 unidades formam 100,00%. */
const UNIDADES_TOTAIS = 100 * 10 ** CASAS_EXIBIDAS;

/**
 * Percentual de cada participante — `base ÷ total × 100`.
 *
 * Serve aos dois métodos com quadro, e a qualquer outro que venha: a conta não
 * conhece receita nem colaborador, só a base.
 *
 * ## Por que não basta arredondar
 *
 * Três ajustes iguais dão 33,333…% cada. Arredondados a duas casas, somam
 * 99,99% — e o usuário fica olhando para um quadro que não fecha, justamente a
 * conferência que o sistema deveria dispensar.
 *
 * A saída é o **método do maior resto**: distribui-se o piso de cada parcela e
 * a sobra vai, uma unidade por vez, a quem tem o maior resto. As parcelas
 * exibidas somam 100,00% por construção, e nenhuma se afasta da exata por mais
 * de um centésimo. O percentual exato continua disponível para quem precisar
 * dele; o exibido é o que fecha.
 *
 * Com total zero devolve zero em vez de dividir por zero — quem decide se isso
 * pode ser gravado é a validação, não a aritmética.
 */
export function calcularRateio(
  participantes: { ajusteId: string; base: number }[],
): ResultadoRateio {
  const totalBase = arredondar(
    participantes.reduce((s, p) => s + (Number.isFinite(p.base) ? p.base : 0), 0),
    2,
  );

  if (totalBase <= 0) {
    return {
      linhas: participantes.map((p) => ({
        ajusteId: p.ajusteId,
        base: p.base,
        percentual: 0,
        percentualExibido: 0,
      })),
      totalBase,
      totalPercentual: 0,
    };
  }

  const cru = participantes.map((p) => {
    const exato = (p.base / totalBase) * 100;
    const unidades = exato * 10 ** CASAS_EXIBIDAS;
    return { ...p, exato, piso: Math.floor(unidades), resto: unidades - Math.floor(unidades) };
  });

  // A sobra do piso é distribuída a quem tem o maior resto. Empate desempata
  // pela maior base, e depois pela ordem — para o resultado ser sempre o mesmo.
  let sobra = UNIDADES_TOTAIS - cru.reduce((s, c) => s + c.piso, 0);
  const porResto = cru
    .map((c, i) => ({ i, resto: c.resto, base: c.base }))
    .sort((a, b) => b.resto - a.resto || b.base - a.base || a.i - b.i);

  const extra = new Array(cru.length).fill(0);
  for (let k = 0; sobra > 0 && k < porResto.length; k++, sobra--) extra[porResto[k].i] = 1;

  const linhas = cru.map((c, i) => ({
    ajusteId: c.ajusteId,
    base: c.base,
    percentual: arredondar(c.exato, CASAS_PERCENTUAL),
    percentualExibido: (c.piso + extra[i]) / 10 ** CASAS_EXIBIDAS,
  }));

  return {
    linhas,
    totalBase,
    totalPercentual: arredondar(
      linhas.reduce((s, l) => s + l.percentualExibido, 0),
      CASAS_EXIBIDAS,
    ),
  };
}

/** Vigências que se tocam — duas datas de período se sobrepõem. */
export function periodosSobrepoem(
  a: { inicio: string; fim: string },
  b: { inicio: string; fim: string },
): boolean {
  return a.inicio <= b.fim && b.inicio <= a.fim;
}

/**
 * Rateios vigentes numa data — o que a utilização futura precisa perguntar.
 *
 * Vários podem estar vigentes ao mesmo tempo, e isso é esperado: o método se
 * escolhe pela natureza da despesa. Quem usa é que escolhe entre eles.
 */
export function vigentesEm<T extends { vigenciaInicio: string; vigenciaFim: string; ativo: boolean }>(
  rateios: T[],
  data: string,
): T[] {
  return rateios.filter((r) => r.ativo && r.vigenciaInicio <= data && data <= r.vigenciaFim);
}

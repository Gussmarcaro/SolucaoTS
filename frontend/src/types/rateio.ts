/**
 * Rateio — espelha `core/rateio/Rateio.ts` do backend, que é quem decide.
 *
 * A conta vive nos dois lados de propósito: a tela precisa recalcular a cada
 * tecla, sem ida ao servidor, e o servidor precisa recusar dado inconsistente
 * que chegue por qualquer outro caminho. Se divergirem, o usuário vê um total
 * e grava outro — por isso `npm test` fixa os mesmos casos dos dois lados.
 */

export type MetodoRateio = 'RECEITA' | 'COLABORADORES' | 'OUTROS';

export type FormatoBase = 'MOEDA' | 'INTEIRO';

export interface DefinicaoMetodo {
  id: MetodoRateio;
  rotulo: string;
  /** Nulo = o método não tem quadro de participantes. */
  rotuloBase: string | null;
  formato: FormatoBase | null;
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
  { id: 'OUTROS', rotulo: 'Outros', rotuloBase: null, formato: null, rotuloTotal: null },
];

export const definicaoDoMetodo = (id: string): DefinicaoMetodo | undefined =>
  METODOS.find((m) => m.id === id);

export const temQuadro = (id: string): boolean => !!definicaoDoMetodo(id)?.rotuloBase;

export interface ParticipanteRateio {
  id: string;
  rateioId: string;
  ajusteId: string | null;
  ajusteCodigo: string | null;
  ajusteObjeto: string | null;
  entidadeNome: string | null;
  /** Origem que não é ajuste: o particular, o plano de saúde, o SUS. */
  origem: string | null;
  /** Receita, nº de colaboradores… — o método diz o quê. */
  base: number;
}

export interface Rateio {
  id: string;
  titulo: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  metodo: MetodoRateio;
  descricaoMetodo: string | null;
  observacoes: string | null;
  ativo: boolean;
  participantes: ParticipanteRateio[];
  criadoPor: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RateioPayload {
  titulo: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  metodo: MetodoRateio;
  descricaoMetodo?: string | null;
  observacoes?: string | null;
  /** Cada linha é **ou** um ajuste, **ou** uma origem própria da entidade. */
  participantes: { ajusteId: string | null; origem?: string | null; base: number }[];
}

/** Precisão guardada no cálculo interno. */
export const CASAS_PERCENTUAL = 6;
/** Casas mostradas ao usuário — "10,00%". É nelas que o total fecha 100,00%. */
export const CASAS_EXIBIDAS = 2;

export interface LinhaCalculada {
  /** Nulo na linha de recurso próprio da entidade — ela não é parceria. */
  ajusteId: string | null;
  base: number;
  /** Percentual exato — `base ÷ total × 100`, com toda a precisão. */
  percentual: number;
  /** Como a tela mostra: 2 casas, ajustado para as parcelas somarem 100,00%. */
  percentualExibido: number;
}

export interface ResultadoRateio {
  linhas: LinhaCalculada[];
  totalBase: number;
  totalPercentual: number;
}

const arredondar = (n: number, casas: number) => {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const UNIDADES_TOTAIS = 100 * 10 ** CASAS_EXIBIDAS;

/**
 * Percentual de cada participante — `base ÷ total × 100`.
 *
 * ## Por que não basta arredondar
 *
 * Três ajustes iguais dão 33,333…% cada. Arredondados a duas casas, somam
 * 99,99% — e o usuário fica olhando para um quadro que não fecha, justamente a
 * conferência que o sistema deveria dispensar.
 *
 * A saída é o **método do maior resto**: distribui-se o piso de cada parcela e
 * a sobra vai, de centésimo em centésimo, a quem tem o maior resto. As parcelas
 * exibidas somam 100,00% por construção, e nenhuma se afasta da exata por mais
 * de um centésimo.
 */
export function calcularRateio(
  participantes: { ajusteId: string | null; base: number }[],
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

/** "10,00%" — sempre com as duas casas, para a coluna alinhar. */
export const percentualBr = (n: number): string =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: CASAS_EXIBIDAS, maximumFractionDigits: CASAS_EXIBIDAS })}%`;

/** Rateios vigentes numa data. Vários podem valer ao mesmo tempo. */
export function vigentesEm<T extends { vigenciaInicio: string; vigenciaFim: string; ativo: boolean }>(
  rateios: T[],
  data: string,
): T[] {
  return rateios.filter((r) => r.ativo && r.vigenciaInicio <= data && data <= r.vigenciaFim);
}

/** Uma parcela da despesa rateada: quanto cabe a cada ajuste. */
export interface ParcelaRateada {
  /** Nulo na linha de recurso próprio: esta fatia não cabe a nenhum ajuste. */
  ajusteId: string | null;
  /** O percentual exibido, o mesmo do quadro. */
  percentual: number;
  /** Em reais, duas casas. As parcelas somam o total **por construção**. */
  valor: number;
}

/**
 * Divide um valor entre os participantes — **espelho do `ratearValor` do
 * backend**, que é quem divide de verdade.
 *
 * Existe aqui para a **prévia**: quem lança a despesa e quem lança o pagamento
 * precisam ver quanto vai para cada ajuste antes de confirmar. Nenhum valor
 * calculado nesta função é enviado ao servidor.
 *
 * **Não aplica os percentuais exibidos.** Três ajustes iguais dão 33,33% cada,
 * e 33,33% de R$ 100,00 três vezes são R$ 99,99 — a prévia mostraria um total
 * que não é o da nota. Divide-se em **centavos**, pelo mesmo método do maior
 * resto que o quadro já usa, e a soma das parcelas é o total, sempre.
 *
 * O casamento com os participantes é **por posição**, não por `ajusteId`: duas
 * linhas de recurso próprio têm o id nulo e casariam as duas com a primeira.
 */
export function ratearValor(
  valorTotal: number,
  participantes: { ajusteId: string | null; base: number }[],
): ParcelaRateada[] {
  const { linhas } = calcularRateio(participantes);
  if (!linhas.length) return [];

  const centavosTotais = Math.round(arredondar(valorTotal, 2) * 100);
  const totalBase = participantes.reduce(
    (s, p) => s + (Number.isFinite(p.base) && p.base > 0 ? p.base : 0),
    0,
  );

  // Sem base não há proporção: divide-se igualmente, que é o mesmo critério
  // que o quadro adota ao exibir os percentuais.
  const exatos = linhas.map((_, i) => {
    const p = participantes[i];
    const peso = totalBase > 0 ? (p && p.base > 0 ? p.base : 0) / totalBase : 1 / linhas.length;
    return peso * centavosTotais;
  });

  const pisos = exatos.map((e) => Math.floor(e));
  let sobra = centavosTotais - pisos.reduce((s, v) => s + v, 0);

  // Empate resolve pela ordem, que é estável: a mesma nota rateada duas vezes
  // dá o mesmo resultado.
  const ordem = exatos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);

  const centavos = [...pisos];
  for (const { i } of ordem) {
    if (sobra <= 0) break;
    centavos[i] += 1;
    sobra -= 1;
  }

  return linhas.map((l, i) => ({
    ajusteId: l.ajusteId,
    percentual: l.percentualExibido,
    valor: centavos[i] / 100,
  }));
}

/**
 * O vocabulário e a aritmética do Plano de Metas — **espelho do backend**.
 *
 * `core/meta/periodos.ts` e `core/meta/Meta.ts` têm as mesmas regras, e é
 * deliberado: o formulário precisa desenhar o quadro de períodos *enquanto* a
 * pessoa escolhe a periodicidade e a vigência, muito antes de enviar. Pedir os
 * períodos ao servidor a cada tecla trocaria um cálculo de microssegundos por
 * uma ida à rede.
 *
 * **O preço é a divergência.** Se os dois lados discordarem, a tela oferece um
 * quadro que o servidor recusa — e o usuário não tem como saber por quê. É o
 * mesmo risco de `types/tarefa.ts`, e a proteção é a mesma: `meta.test.ts`
 * trava aqui os casos que `npm run verificar:metas` trava lá, com os mesmos
 * números. Divergiu, um dos dois fica vermelho.
 */

export type TipoMeta =
  | 'QUANTITATIVA'
  | 'QUALITATIVA_QUANTIFICAVEL'
  | 'QUALITATIVA_NAO_QUANTIFICAVEL';

export type PeriodicidadeMeta =
  | 'MENSAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'QUADRIMESTRAL'
  | 'SEMESTRAL'
  | 'EXERCICIO'
  | 'UNICA';

/**
 * Os sete qualificadores do cadastro do AUDESP.
 *
 * Os cinco primeiros comparam com um patamar; `REDUZIR_EM` e `AUMENTAR_EM`
 * descrevem uma **variação** sobre um ponto de partida que não existe no nosso
 * modelo — por isso `avaliarMeta` devolve indeterminado neles.
 */
export type QualificadorMeta =
  | 'IGUAL_A'
  | 'MAIOR_QUE'
  | 'MAIOR_OU_IGUAL_A'
  | 'MENOR_QUE'
  | 'MENOR_OU_IGUAL_A'
  | 'REDUZIR_EM'
  | 'AUMENTAR_EM';

const MESES_POR_PERIODO: Record<PeriodicidadeMeta, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  EXERCICIO: 12,
  UNICA: 12,
};

export const periodosNoAno = (p: PeriodicidadeMeta): number => 12 / MESES_POR_PERIODO[p];

export const TIPOS_META: { id: TipoMeta; rotulo: string; ajuda: string }[] = [
  {
    id: 'QUANTITATIVA',
    rotulo: 'Quantitativa',
    ajuda: 'Conta-se: atendimentos, consultas, cestas entregues.',
  },
  {
    id: 'QUALITATIVA_QUANTIFICAVEL',
    rotulo: 'Qualitativa quantificável',
    ajuda: 'Qualidade que tem medida — relatórios entregues, reuniões realizadas.',
  },
  {
    id: 'QUALITATIVA_NAO_QUANTIFICAVEL',
    rotulo: 'Qualitativa não quantificável',
    ajuda: 'Só se afere como cumprida ou não. Sem unidade e sem períodos.',
  },
];

export const PERIODICIDADES_META: { id: PeriodicidadeMeta; rotulo: string }[] = [
  { id: 'MENSAL', rotulo: 'Mensal' },
  { id: 'BIMESTRAL', rotulo: 'Bimestral' },
  { id: 'TRIMESTRAL', rotulo: 'Trimestral' },
  { id: 'QUADRIMESTRAL', rotulo: 'Quadrimestral' },
  { id: 'SEMESTRAL', rotulo: 'Semestral' },
  { id: 'EXERCICIO', rotulo: 'No exercício' },
  { id: 'UNICA', rotulo: 'Única' },
];

export const QUALIFICADORES_META: {
  id: QualificadorMeta;
  rotulo: string;
  simbolo: string;
  /** Nos relativos a quantidade é um **delta**, não um alvo. */
  relativo: boolean;
}[] = [
  { id: 'IGUAL_A', rotulo: 'Igual a', simbolo: '=', relativo: false },
  { id: 'MAIOR_QUE', rotulo: 'Maior que', simbolo: '>', relativo: false },
  { id: 'MAIOR_OU_IGUAL_A', rotulo: 'Maior ou igual a', simbolo: '≥', relativo: false },
  { id: 'MENOR_QUE', rotulo: 'Menor que', simbolo: '<', relativo: false },
  { id: 'MENOR_OU_IGUAL_A', rotulo: 'Menor ou igual a', simbolo: '≤', relativo: false },
  { id: 'REDUZIR_EM', rotulo: 'Reduzir em', simbolo: '↓', relativo: true },
  { id: 'AUMENTAR_EM', rotulo: 'Aumentar em', simbolo: '↑', relativo: true },
];

export const ehRelativo = (q: QualificadorMeta): boolean =>
  QUALIFICADORES_META.find((x) => x.id === q)?.relativo ?? false;

export const rotuloQualificador = (q: QualificadorMeta): string =>
  QUALIFICADORES_META.find((x) => x.id === q)?.rotulo ?? q;

export const simboloQualificador = (q: QualificadorMeta): string =>
  QUALIFICADORES_META.find((x) => x.id === q)?.simbolo ?? '=';

const EPS = 0.005;

export interface AvaliacaoMeta {
  /** `true` cumprida, `false` não cumprida, **`null` indeterminado**. */
  atingiu: boolean | null;
  /** Quanto falta (positivo) ou quanto excedeu (negativo). */
  diferenca: number;
  percentual: number | null;
}

/**
 * Compara o realizado com o pactuado, **segundo o qualificador** — espelho de
 * `core/meta/Meta.ts`.
 *
 * Erra em silêncio: um verde no lugar errado não quebra tela nenhuma, e é a
 * Comissão de Fiscalização que assina confiando nele.
 */
export function avaliarMeta(
  qualificador: QualificadorMeta,
  prevista: number,
  realizado: number | null,
): AvaliacaoMeta {
  if (realizado === null || !Number.isFinite(realizado))
    return { atingiu: null, diferenca: 0, percentual: null };

  const percentual = prevista > 0 ? (realizado / prevista) * 100 : null;

  if (ehRelativo(qualificador)) return { atingiu: null, diferenca: 0, percentual: null };

  const atingiu = {
    IGUAL_A: Math.abs(realizado - prevista) < EPS,
    MAIOR_QUE: realizado > prevista + EPS,
    MAIOR_OU_IGUAL_A: realizado >= prevista - EPS,
    MENOR_QUE: realizado < prevista - EPS,
    MENOR_OU_IGUAL_A: realizado <= prevista + EPS,
    REDUZIR_EM: false,
    AUMENTAR_EM: false,
  }[qualificador];

  return { atingiu, diferenca: prevista - realizado, percentual };
}

/** Derivado do tipo, nunca gravado — ver a nota em `core/meta/Meta.ts`. */
export const ehQuantificavel = (t: TipoMeta): boolean => t !== 'QUALITATIVA_NAO_QUANTIFICAVEL';
export const temDetalhePeriodico = (t: TipoMeta): boolean => ehQuantificavel(t);

export const rotuloTipo = (t: TipoMeta): string =>
  TIPOS_META.find((x) => x.id === t)?.rotulo ?? t;
export const rotuloPeriodicidadeMeta = (p: PeriodicidadeMeta): string =>
  PERIODICIDADES_META.find((x) => x.id === p)?.rotulo ?? p;

export interface PeriodoMeta {
  ano: number;
  periodo: number;
  mesInicial: number;
  mesFinal: number;
  meses: number;
  parcial: boolean;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** 'YYYY-MM-DD' → ano e mês, sem passar por `Date` (que desloca fuso). */
function anoMes(iso: string): { ano: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mes };
}

/**
 * Os períodos da meta, a partir da vigência dela.
 *
 * O primeiro e o último podem ser **parciais**: a vigência raramente começa no
 * dia 1º de um período cheio, e a contagem é ancorada no **ano civil** — o 2º
 * quadrimestre é mai–ago, comece a meta em junho ou não. Ver o exemplo do
 * manual em `core/meta/periodos.ts`.
 */
export function gerarPeriodos(
  periodicidade: PeriodicidadeMeta,
  inicio: string | null | undefined,
  fim: string | null | undefined,
): PeriodoMeta[] {
  const a = inicio ? anoMes(inicio) : null;
  const b = fim ? anoMes(fim) : null;
  if (!a || !b) return [];
  if (b.ano < a.ano || (b.ano === a.ano && b.mes < a.mes)) return [];

  if (periodicidade === 'UNICA') {
    const meses = (b.ano - a.ano) * 12 + (b.mes - a.mes) + 1;
    return [{ ano: a.ano, periodo: 1, mesInicial: a.mes, mesFinal: b.mes, meses, parcial: false }];
  }

  const largura = MESES_POR_PERIODO[periodicidade];
  const out: PeriodoMeta[] = [];

  for (let ano = a.ano; ano <= b.ano; ano += 1) {
    for (let periodo = 1; periodo <= periodosNoAno(periodicidade); periodo += 1) {
      const cheioInicio = (periodo - 1) * largura + 1;
      const cheioFim = periodo * largura;
      const mesInicial = ano === a.ano ? Math.max(cheioInicio, a.mes) : cheioInicio;
      const mesFinal = ano === b.ano ? Math.min(cheioFim, b.mes) : cheioFim;
      if (mesInicial > mesFinal) continue;
      const meses = mesFinal - mesInicial + 1;
      out.push({ ano, periodo, mesInicial, mesFinal, meses, parcial: meses < largura });
    }
  }
  return out;
}

export function rotuloPeriodo(periodicidade: PeriodicidadeMeta, p: PeriodoMeta): string {
  if (periodicidade === 'MENSAL') return MESES[p.mesInicial - 1];
  if (periodicidade === 'EXERCICIO') return 'No exercício';
  if (periodicidade === 'UNICA') return 'Única';
  const nome: Record<string, string> = {
    BIMESTRAL: 'bimestre',
    TRIMESTRAL: 'trimestre',
    QUADRIMESTRAL: 'quadrimestre',
    SEMESTRAL: 'semestre',
  };
  return `${p.periodo}º ${nome[periodicidade]}`;
}

/** "jun–ago/2025" — os meses que o período cobre, já recortados. */
export function intervaloPeriodo(p: PeriodoMeta): string {
  const abrev = (m: number) => MESES[m - 1].slice(0, 3).toLowerCase();
  return p.mesInicial === p.mesFinal
    ? `${abrev(p.mesInicial)}/${p.ano}`
    : `${abrev(p.mesInicial)}–${abrev(p.mesFinal)}/${p.ano}`;
}

/**
 * Distribui um total entre os períodos, **proporcional aos meses de cada um**.
 *
 * É o que está por trás do botão "mesma quantidade em todos": com período
 * parcial, repetir o mesmo número em todos não seria "igual" coisa nenhuma —
 * exigiria de um quadrimestre de 3 meses o mesmo que de um de 4.
 *
 * Maior resto, como o rateio: as parcelas somam exatamente o total.
 */
export function distribuirProporcional(total: number, periodos: PeriodoMeta[]): number[] {
  if (!periodos.length) return [];
  const mesesTotais = periodos.reduce((s, p) => s + p.meses, 0);
  if (mesesTotais <= 0) return periodos.map(() => 0);

  const centesimos = Math.round(total * 100);
  const exatos = periodos.map((p) => (p.meses / mesesTotais) * centesimos);
  const pisos = exatos.map((e) => Math.floor(e));
  let sobra = centesimos - pisos.reduce((s, v) => s + v, 0);

  const ordem = exatos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((x, y) => y.resto - x.resto || x.i - y.i);

  const out = [...pisos];
  for (const { i } of ordem) {
    if (sobra <= 0) break;
    out[i] += 1;
    sobra -= 1;
  }
  return out.map((c) => c / 100);
}

// ---------------------------------------------------------------------------
// Apuração do atingimento — espelho de `core/meta/apuracao.ts`.
//
// Está aqui, e não só no servidor, porque a aba do Relatório de Atividades
// mostra o percentual enquanto se preenche. E o percentual **pode virar
// desconto no repasse**: o TCESP define o bloco Desconto como "a dedução
// aplicada ao valor de repasse em razão do descumprimento parcial ou integral
// de metas". A tela mostrar um número e o painel de pendências outro seria o
// pior dos mundos — daí `meta.test.ts` travar os mesmos casos de
// `verificar:metas`.
// ---------------------------------------------------------------------------

export interface PrevistoDoPeriodo {
  nomePrograma: string;
  codigoMeta: string;
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: number;
}

export interface AfericaoParaApurar {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  quantidadeRealizada: number | null;
  resultadoMeta: 'CUMPRIDA' | 'NAO_CUMPRIDA' | 'CUMPRIDA_PARCIALMENTE' | null;
  metaAtendida: boolean | null;
  justificativa: string | null;
}

export type SituacaoAfericao = 'ATINGIDA' | 'NAO_ATINGIDA' | 'INDETERMINADA';

export interface LinhaApuracao {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  situacao: SituacaoAfericao;
  semJustificativa: boolean;
  /** Marcada como atendida, com quantidade fora do pactuado. */
  divergente: boolean;
}

export interface ApuracaoMetas {
  aferidas: number;
  atingidas: number;
  naoAtingidas: number;
  /** Sem previsto cadastrado, ou meta de variação — fora do percentual. */
  indeterminadas: number;
  naoAtingidasSemJustificativa: number;
  divergentes: number;
  percentualNaoAtingido: number;
  linhas: LinhaApuracao[];
}

const chaveApuracao = (programa: string, meta: string, periodo: number) =>
  `${programa.trim().toLowerCase()}\u0000${meta.trim().toLowerCase()}\u0000${periodo}`;

/**
 * A situação de uma aferição, em ordem de precedência: o julgamento humano
 * vence a aritmética; a qualitativa responde por si (e "cumprida parcialmente"
 * é descumprimento, como diz a definição do TCESP); a quantificável compara
 * com o previsto daquele período, pelo qualificador.
 */
function situacaoDaAfericao(
  a: AfericaoParaApurar,
  previsto: PrevistoDoPeriodo | undefined,
): SituacaoAfericao {
  if (a.metaAtendida === false) return 'NAO_ATINGIDA';
  if (a.resultadoMeta) return a.resultadoMeta === 'CUMPRIDA' ? 'ATINGIDA' : 'NAO_ATINGIDA';
  if (a.quantidadeRealizada === null || !previsto) return 'INDETERMINADA';
  const { atingiu } = avaliarMeta(previsto.qualificador, previsto.quantidade, a.quantidadeRealizada);
  return atingiu === null ? 'INDETERMINADA' : atingiu ? 'ATINGIDA' : 'NAO_ATINGIDA';
}

export function apurarMetas(
  afericoes: AfericaoParaApurar[],
  previstos: PrevistoDoPeriodo[],
  exercicio: number,
): ApuracaoMetas {
  const previsto = new Map<string, PrevistoDoPeriodo>();
  for (const p of previstos)
    if (p.ano === exercicio)
      previsto.set(chaveApuracao(p.nomePrograma, p.codigoMeta, p.periodo), p);

  const linhas: LinhaApuracao[] = afericoes.map((a) => {
    const situacao = situacaoDaAfericao(
      a,
      previsto.get(chaveApuracao(a.nomePrograma, a.codigoMeta, a.periodo)),
    );
    return {
      nomePrograma: a.nomePrograma,
      codigoMeta: a.codigoMeta,
      periodo: a.periodo,
      situacao,
      semJustificativa: situacao === 'NAO_ATINGIDA' && !a.justificativa?.trim(),
      divergente: situacao === 'NAO_ATINGIDA' && a.metaAtendida === true,
    };
  });

  const atingidas = linhas.filter((l) => l.situacao === 'ATINGIDA').length;
  const naoAtingidas = linhas.filter((l) => l.situacao === 'NAO_ATINGIDA').length;
  const comVeredito = atingidas + naoAtingidas;

  return {
    aferidas: linhas.length,
    atingidas,
    naoAtingidas,
    indeterminadas: linhas.filter((l) => l.situacao === 'INDETERMINADA').length,
    naoAtingidasSemJustificativa: linhas.filter((l) => l.semJustificativa).length,
    divergentes: linhas.filter((l) => l.divergente).length,
    percentualNaoAtingido:
      comVeredito === 0 ? 0 : Math.round((naoAtingidas / comVeredito) * 10000) / 100,
    linhas,
  };
}

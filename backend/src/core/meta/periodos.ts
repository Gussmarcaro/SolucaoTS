/**
 * Os períodos de uma meta, a partir da vigência dela.
 *
 * **É a regra que erra em silêncio deste módulo.** Gerar 4 períodos onde
 * deviam ser 5 não quebra tela nenhuma: o usuário preenche as quantidades que
 * o sistema ofereceu, transmite, e a rejeição chega meses depois — e a
 * síntese de regras já avisa que meta é a maior fonte de rejeição da Fase V,
 * porque precisa casar com o cadastro em *código, nome, período e
 * periodicidade*.
 *
 * Por isso a regra é função pura, coberta por `npm run verificar:metas`, sem
 * banco.
 *
 * ## O que o manual diz, e que não é óbvio
 *
 * Os períodos **não são uniformes**. O primeiro e o último podem ser parciais,
 * porque a vigência raramente começa no dia 1º de um período cheio:
 *
 * > vigência inicia em 01/06 e a periodicidade é quadrimestral → na primeira
 * > periodicidade haverá somente 3 meses (junho, julho e agosto) e na última
 * > somente um mês (maio)
 *
 * A contagem dos períodos é **ancorada no ano civil**, não na data de início:
 * o quadrimestre 1 é jan–abr, o 2 é mai–ago, o 3 é set–dez. Uma vigência que
 * começa em junho cai no meio do quadrimestre 2, e é esse recorte que torna o
 * primeiro período curto.
 */

export type PeriodicidadeMeta =
  | 'MENSAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'QUADRIMESTRAL'
  | 'SEMESTRAL'
  | 'EXERCICIO'
  | 'UNICA';

/** Quantos meses cabem em um período de cada periodicidade. */
const MESES_POR_PERIODO: Record<PeriodicidadeMeta, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  EXERCICIO: 12,
  UNICA: 12,
};

/** Quantos períodos um ano cheio tem. Serve à tela, que rotula "1 de 12". */
export function periodosNoAno(p: PeriodicidadeMeta): number {
  return 12 / MESES_POR_PERIODO[p];
}

export interface PeriodoMeta {
  ano: number;
  /** 1..12 conforme a periodicidade. */
  periodo: number;
  /** Primeiro e último mês **efetivos** (1-12), já recortados pela vigência. */
  mesInicial: number;
  mesFinal: number;
  /**
   * Meses que o período realmente cobre.
   *
   * Menor que o cheio quando a vigência corta o período — é o que o manual
   * manda considerar "para a inclusão das quantidades": um quadrimestre de
   * 3 meses não comporta a mesma meta de um de 4.
   */
  meses: number;
  /** `true` quando a vigência cortou este período. A tela avisa. */
  parcial: boolean;
}

/** Ano e mês de uma data, em UTC — as datas do schema são `@db.Date`. */
const anoMes = (d: Date) => ({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 });

/**
 * Gera os períodos entre duas datas.
 *
 * Devolve vazio quando faltam datas ou quando o fim precede o início: período
 * inventado a partir de vigência incompleta seria pior que nenhum — o usuário
 * preencheria quantidades que não correspondem a nada.
 */
export function gerarPeriodos(
  periodicidade: PeriodicidadeMeta,
  inicio: Date | null | undefined,
  fim: Date | null | undefined,
): PeriodoMeta[] {
  if (!inicio || !fim) return [];
  if (fim < inicio) return [];

  const a = anoMes(inicio);
  const b = anoMes(fim);

  /*
   * `UNICA` é um período só, cobrindo a vigência inteira.
   *
   * Ela existe para a meta qualitativa não quantificável, que o manual diz
   * não ter detalhamento de periodicidade. Devolvemos uma linha mesmo assim
   * para a tela ter onde exibir a vigência — mas sem quantidade a preencher.
   */
  if (periodicidade === 'UNICA') {
    const meses = (b.ano - a.ano) * 12 + (b.mes - a.mes) + 1;
    return [
      { ano: a.ano, periodo: 1, mesInicial: a.mes, mesFinal: b.mes, meses, parcial: false },
    ];
  }

  const largura = MESES_POR_PERIODO[periodicidade];
  const out: PeriodoMeta[] = [];

  for (let ano = a.ano; ano <= b.ano; ano += 1) {
    const total = periodosNoAno(periodicidade);

    for (let periodo = 1; periodo <= total; periodo += 1) {
      // Limites do período no **ano civil**, antes de qualquer recorte.
      const cheioInicio = (periodo - 1) * largura + 1;
      const cheioFim = periodo * largura;

      // Recorte pela vigência: no primeiro ano ela pode começar depois do
      // início do período; no último, terminar antes do fim.
      const mesInicial = ano === a.ano ? Math.max(cheioInicio, a.mes) : cheioInicio;
      const mesFinal = ano === b.ano ? Math.min(cheioFim, b.mes) : cheioFim;

      // O período inteiro ficou fora da vigência.
      if (mesInicial > mesFinal) continue;

      const meses = mesFinal - mesInicial + 1;
      out.push({ ano, periodo, mesInicial, mesFinal, meses, parcial: meses < largura });
    }
  }

  return out;
}

/** Rótulo do período para a tela — "Janeiro", "2º quadrimestre"… */
export function rotuloPeriodo(periodicidade: PeriodicidadeMeta, p: PeriodoMeta): string {
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
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

/**
 * Distribui uma quantidade total entre os períodos, **proporcional aos meses**.
 *
 * Existe para o botão "mesma quantidade em todos" do manual, e para o caso que
 * ele não cobre: quando há período parcial, "igual para todos" produziria uma
 * meta mensalizada errada — pedir 100 atendimentos num quadrimestre de 3 meses
 * e noutro de 4 não é a mesma exigência.
 *
 * Usa o método do **maior resto**, como o rateio: distribuir o piso e dar a
 * sobra a quem tem o maior resto faz as parcelas somarem exatamente o total.
 * Arredondar cada uma por conta própria não fecharia — e é a soma que o
 * Tribunal confere.
 */
export function distribuirProporcional(total: number, periodos: PeriodoMeta[]): number[] {
  if (!periodos.length) return [];
  const mesesTotais = periodos.reduce((s, p) => s + p.meses, 0);
  if (mesesTotais <= 0) return periodos.map(() => 0);

  // Em centésimos, para acomodar meta fracionária sem perder centavo.
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

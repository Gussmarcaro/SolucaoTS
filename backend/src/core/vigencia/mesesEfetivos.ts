/**
 * Quais meses do calendário a vigência realmente ocupa.
 *
 * **A regra:** um mês entra quando a vigência cobre **a maior parte dos dias
 * dele**. O resto é consequência.
 *
 * ## Por que ela existe
 *
 * Um convênio de 29/01/2026 a 28/01/2027 dura doze meses, mas encosta em
 * **treze** meses do calendário: três dias de janeiro de 2026 na ponta e
 * vinte e oito de janeiro de 2027 na outra. Contando mês a mês, o sistema
 * criava um período de janeiro/2026 indistinguível de um mês inteiro —
 * oferecia a mesma meta e o mesmo valor mensal para três dias.
 *
 * O estrago não é de tela:
 *
 * - no Plano de Metas, "quantidade igual em todos os períodos" dividia o total
 *   por 13, e a meta mensal saía menor que a pactuada em **todos** os meses;
 * - no Plano de Aplicação, o valor mensal era replicado em 13 competências, e
 *   o total do plano **estourava o valor global** — que hoje é pendência que
 *   impede a prestação.
 *
 * E, o que decide: a tela do TCESP gera **doze** períodos para essa vigência,
 * de fevereiro/2026 a janeiro/2027. O plano de metas é confrontado pelo
 * Tribunal em código, nome, **período** e periodicidade — divergir aqui é a
 * maior fonte de rejeição da Fase V.
 *
 * ## O que a regra não é
 *
 * Não é reancorar a contagem na vigência. O período continua sendo a casa do
 * **ano civil** — o 2º quadrimestre é mai–ago, comece a parceria em junho ou
 * não —, e é por isso que o exemplo do manual (vigência de 01/06, primeira
 * periodicidade com 3 meses: junho, julho e agosto) continua valendo intacto.
 * Ali as pontas caem no dia 1º e no último dia, então não há dia solto a
 * decidir, e esta regra não muda nada.
 *
 * ## O dia solto não some da execução
 *
 * Os três dias de janeiro/2026 continuam sendo vigência: o que eles não têm é
 * período próprio. São reportados no período vizinho — que é exatamente o que
 * a entidade faz quando apresenta "29/01 a 28/02" como o primeiro mês.
 *
 * ## O empate
 *
 * As duas pontas se completam: o que falta numa sobra na outra. Por isso o
 * início desempata para **dentro** (`>=`) e o fim para **fora** (`>`) — assim
 * uma vigência de doze meses dá sempre doze competências, nunca onze ou
 * treze, mesmo quando o mês se parte exatamente ao meio.
 */

export interface DiaRef {
  ano: number;
  mes: number;
  dia: number;
}

export interface MesRef {
  ano: number;
  mes: number;
}

export interface JanelaEfetiva {
  de: MesRef;
  ate: MesRef;
}

/** Dias do mês, em UTC — as datas da vigência são `@db.Date`. */
export const diasNoMes = (ano: number, mes: number): number =>
  new Date(Date.UTC(ano, mes, 0)).getUTCDate();

const indice = (m: MesRef): number => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesRef => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

/**
 * A janela de meses da vigência, já descartadas as pontas minoritárias.
 *
 * Quem chama garante que `fim` não precede `inicio`.
 */
export function janelaEfetiva(inicio: DiaRef, fim: DiaRef): JanelaEfetiva {
  const iInicio = indice(inicio);
  const iFim = indice(fim);

  // Vigência dentro de um mês só: não há para onde empurrar, e descartá-la
  // deixaria a meta sem período nenhum.
  if (iInicio === iFim) {
    return { de: { ano: inicio.ano, mes: inicio.mes }, ate: { ano: fim.ano, mes: fim.mes } };
  }

  const diasDoPrimeiro = diasNoMes(inicio.ano, inicio.mes);
  const diasDoUltimo = diasNoMes(fim.ano, fim.mes);

  const cobrePrimeiro = diasDoPrimeiro - inicio.dia + 1;
  const cobreUltimo = fim.dia;

  const de = cobrePrimeiro * 2 >= diasDoPrimeiro ? iInicio : iInicio + 1;
  const ate = cobreUltimo * 2 > diasDoUltimo ? iFim : iFim - 1;

  /*
   * Vigência curta a cavalo de dois meses, sem maioria em nenhum dos dois
   * (30/03 a 02/04, por exemplo). Devolver janela vazia deixaria a meta sem
   * período e o plano sem competência — fica o mês de maior presença.
   */
  if (de > ate) {
    const i = cobrePrimeiro >= cobreUltimo ? iInicio : iFim;
    return { de: doIndice(i), ate: doIndice(i) };
  }

  return { de: doIndice(de), ate: doIndice(ate) };
}

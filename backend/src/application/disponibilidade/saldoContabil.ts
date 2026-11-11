import type { ContaBancariaChave } from '@/core/conciliacao/contas';

/**
 * O saldo **contábil** de cada conta no último dia do exercício.
 *
 * O manual é expresso: o saldo da disponibilidade é o da **data final do
 * período** da prestação — 31/12 do exercício, não o de hoje. Ele era digitado
 * à mão, e a conta que o produz já está toda no sistema: o que entrou pela
 * conta, menos o que saiu por ela.
 *
 * ## O que esta conta é, e o que ela não é
 *
 * É o **contábil**: a soma dos lançamentos que o órgão registrou. Não é o
 * **bancário**, que vem do extrato — e que o leitor de OFX ainda não captura.
 * Os dois são campos distintos no schema justamente porque podem divergir, e a
 * diferença entre eles é o que a conciliação existe para explicar. Sugerir o
 * mesmo número nos dois apagaria essa diferença e faria o documento afirmar
 * uma conciliação que ninguém fez.
 *
 * ## Por que o ponto de partida é zero
 *
 * A conta de uma parceria nasce para ela e recebe o primeiro repasse zerada —
 * é essa a prática, e é o que torna a conta possível. Numa conta que já tinha
 * saldo antes do convênio o número sai menor que o real, e por isso ele é
 * **sugestão**: aparece ao lado do campo, não dentro dele. Quem assina é quem
 * confere.
 *
 * Função pura: o número vai para um documento assinado pelo dirigente.
 */

export interface MovimentoDaConta extends ContaBancariaChave {
  /** Tudo que entrou na conta até a data final (repasses, rendimentos, outras). */
  entradas: number;
  /** Tudo que saiu (pagamentos). */
  saidas: number;
}

export interface SaldoSugerido extends ContaBancariaChave {
  entradas: number;
  saidas: number;
  /** `entradas − saidas`, em centavos exatos. */
  saldoContabil: number;
  /** Quantos lançamentos sustentam o número — zero merece desconfiança. */
  lancamentos: number;
}

/** Soma em centavos e volta a reais: evita o centavo perdido do ponto flutuante. */
const centavos = (v: number) => Math.round(v * 100);

export function saldoContabilDaConta(m: MovimentoDaConta, lancamentos: number): SaldoSugerido {
  return {
    banco: m.banco,
    agencia: m.agencia,
    conta: m.conta,
    entradas: m.entradas,
    saidas: m.saidas,
    saldoContabil: (centavos(m.entradas) - centavos(m.saidas)) / 100,
    lancamentos,
  };
}

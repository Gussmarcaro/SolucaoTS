/**
 * O trabalho acumulado do órgão — o que os atalhos do Dashboard anunciam.
 *
 * ## Por que não é o sino
 *
 * O sino responde "o que **vence**": prazo legal, certidão, prestação
 * rejeitada. Isto responde "o que **está parado**": linhas do extrato que
 * ninguém conciliou, notas sem o arquivo, pagamentos sem comprovante,
 * prestações começadas e não transmitidas. Nada disso tem data — e é por não
 * ter data que acumula sem ninguém ver. Repetir aqui o que o sino já diz
 * ensinaria a ignorar um dos dois.
 */

export type ChavePendencia =
  | 'extratoSemConciliar'
  | 'notasSemArquivo'
  | 'pagamentosSemComprovante'
  | 'prestacoesEmElaboracao';

export interface Pendencia {
  chave: ChavePendencia;
  total: number;
}

/**
 * O recurso da matriz que governa cada contagem — o mesmo da tela para onde o
 * atalho leva. Quem não pode abrir a tela não fica sabendo quanto há nela.
 */
export const RECURSO_DA_PENDENCIA: Record<ChavePendencia, string> = {
  extratoSemConciliar: 'EXECUCAO_CONCILIACAO',
  notasSemArquivo: 'EXECUCAO_DESPESAS',
  pagamentosSemComprovante: 'EXECUCAO_PAGAMENTOS',
  prestacoesEmElaboracao: 'PRESTACAO_CONTAS',
};

export interface IPendenciasRepository {
  /** Conta só as pendências pedidas — o recorte por órgão vem da extension. */
  contar(chaves: ChavePendencia[]): Promise<Pendencia[]>;
}

/**
 * Quando o nome de um fornecedor muda, quais cópias dele podem acompanhar?
 *
 * O nome do credor é **copiado** para a nota fiscal e para o contrato no
 * lançamento — eles se ligam ao fornecedor pelo CPF/CNPJ, não por chave. É o
 * certo: o que foi transmitido ao TCESP não pode mudar depois só porque o
 * cadastro mudou. Mas também deixava o nome antigo nas notas de prestações que
 * ainda nem foram enviadas, que é onde a correção deveria chegar.
 *
 * A regra: uma cópia acompanha o cadastro **só se nunca saiu do sistema** —
 * todas as prestações a que ela pertence estão em elaboração, ou ela ainda não
 * pertence a nenhuma. Enviada, aceita, rejeitada ou substituída, a prestação já
 * levou o nome ao Tribunal, e a cópia fica como foi.
 *
 * A rejeitada também trava, de propósito: ela foi transmitida com aquele nome,
 * e o caminho dela é a retificação — uma prestação nova, que nasce em
 * elaboração e aí sim recebe o nome corrigido.
 */
export function copiaPodeAcompanhar(statusDasPrestacoes: string[]): boolean {
  return statusDasPrestacoes.every((s) => s === 'EM_ELABORACAO');
}

export interface LevantamentoNome {
  /** Nome atual do cadastro — o que as cópias passariam a ter. */
  nome: string;
  notas: { atualizaveis: number; travadas: number };
  contratosPrestacao: { atualizaveis: number; travados: number };
  /** O cadastro de Contratos Firmados nunca é transmitido: sempre atualizável. */
  contratosCadastro: number;
}

export const totalAtualizavel = (l: LevantamentoNome) =>
  l.notas.atualizaveis + l.contratosPrestacao.atualizaveis + l.contratosCadastro;

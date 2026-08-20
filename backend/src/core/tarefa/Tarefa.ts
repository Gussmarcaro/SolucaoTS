/**
 * Tarefa de acompanhamento — o registro do que foi feito diante de um prazo.
 *
 * O sino calcula prazos a partir dos dados; a tarefa é a outra metade: guarda a
 * providência. Sem ela o sistema sabe cobrar e não sabe que já foi atendido.
 */

export type PrioridadeTarefa = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export const PRIORIDADES: PrioridadeTarefa[] = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
export const STATUS: StatusTarefa[] = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

/** Status que ainda pedem ação — é o recorte padrão da tela e do resumo. */
export const STATUS_ABERTOS: StatusTarefa[] = ['PENDENTE', 'EM_ANDAMENTO'];

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazoLegal: string; // 'YYYY-MM-DD'
  ajusteId: string | null;
  /** Compromisso que originou a providência; nulo quando nasceu avulsa. */
  compromissoId: string | null;
  /** Denormalizados para a grade não precisar de uma consulta por linha. */
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  /** Chave do alerta do sino que originou a tarefa; nulo quando foi criada à mão. */
  origemAlerta: string | null;
  concluidaEm: Date | null;
  criadoPor: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Alertas que uma tarefa concluída pode silenciar no sino.
 *
 * A distinção é a regra mais importante deste módulo. São exatamente os prazos
 * de atos praticados **fora** deste sistema — o cadastro do ajuste e do aditivo
 * é feito na tela do TCESP, a Declaração Negativa é transmitida lá. O sistema
 * não tem como verificar se foram cumpridos, então a tarefa concluída é a única
 * prova que ele pode ter, e é justo que encerre a cobrança.
 *
 * Os demais alertas ficam **de fora de propósito**: certidão vencida, prestação
 * rejeitada e prestação do exercício são fatos que estão nos nossos próprios
 * dados. Concluir uma tarefa não renova a certidão nem muda o status no
 * Tribunal — silenciá-los faria o sistema mentir sobre o que ele mesmo sabe.
 * Nesses casos a tarefa aparece ligada ao alerta, mas o alerta permanece.
 */
export const ALERTAS_SILENCIAVEIS = new Set([
  'CADASTRO_AJUSTE',
  'CADASTRO_ADITIVO',
  'DECLARACAO_NEGATIVA',
]);

/** Situação do prazo de uma tarefa aberta. Fechada não tem prazo a correr. */
export type SituacaoPrazo = 'ATRASADA' | 'HOJE' | 'PROXIMA' | 'EM_DIA' | 'ENCERRADA';

export function situacaoPrazo(
  status: StatusTarefa,
  diasRestantes: number,
): SituacaoPrazo {
  if (status === 'CONCLUIDA' || status === 'CANCELADA') return 'ENCERRADA';
  if (diasRestantes < 0) return 'ATRASADA';
  if (diasRestantes === 0) return 'HOJE';
  return diasRestantes <= 7 ? 'PROXIMA' : 'EM_DIA';
}

/** Contagem por situação, para o cabeçalho da tela e o cartão do dashboard. */
export interface ResumoTarefas {
  abertas: number;
  atrasadas: number;
  venceEm7Dias: number;
  concluidas: number;
}

export type PrioridadeTarefa = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazoLegal: string; // 'YYYY-MM-DD'
  ajusteId: string | null;
  /** Compromisso que originou a providência (visita, reunião). */
  compromissoId: string | null;
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  /** Alerta do sino que originou a tarefa; nulo quando foi criada à mão. */
  origemAlerta: string | null;
  concluidaEm: string | null;
  criadoPor: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TarefaPayload {
  titulo: string;
  descricao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazoLegal: string;
  ajusteId: string | null;
  compromissoId?: string | null;
  responsavelId: string | null;
  origemAlerta?: string | null;
}

export interface FiltrosTarefa {
  status?: StatusTarefa;
  prioridade?: PrioridadeTarefa;
  ajusteId?: string;
  /** 'eu' é resolvido no servidor a partir do token. */
  responsavelId?: string;
  abertas?: boolean;
  atrasadas?: boolean;
}

export interface ResumoTarefas {
  abertas: number;
  atrasadas: number;
  venceEm7Dias: number;
  concluidas: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const PRIORIDADE_LABEL: Record<PrioridadeTarefa, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const PRIORIDADE_TONE: Record<PrioridadeTarefa, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  BAIXA: 'neutral',
  MEDIA: 'brand',
  ALTA: 'warning',
  URGENTE: 'danger',
};

export const STATUS_LABEL: Record<StatusTarefa, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const STATUS_TONE: Record<StatusTarefa, 'neutral' | 'brand' | 'success' | 'warning'> = {
  PENDENTE: 'neutral',
  EM_ANDAMENTO: 'brand',
  CONCLUIDA: 'success',
  CANCELADA: 'neutral',
};

/** Status que ainda pedem ação — espelha `STATUS_ABERTOS` do backend. */
export const STATUS_ABERTOS: StatusTarefa[] = ['PENDENTE', 'EM_ANDAMENTO'];

export type SituacaoPrazo = 'ATRASADA' | 'HOJE' | 'PROXIMA' | 'EM_DIA' | 'ENCERRADA';

/** Dias corridos de hoje até a data (negativo = passou). */
export function diasAte(dataISO: string): number {
  const umDia = 24 * 60 * 60 * 1000;
  const alvo = new Date(`${dataISO}T00:00:00`);
  const hoje = new Date();
  const zerar = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((zerar(alvo) - zerar(hoje)) / umDia);
}

export function situacaoPrazo(t: Tarefa): SituacaoPrazo {
  if (t.status === 'CONCLUIDA' || t.status === 'CANCELADA') return 'ENCERRADA';
  const dias = diasAte(t.prazoLegal);
  if (dias < 0) return 'ATRASADA';
  if (dias === 0) return 'HOJE';
  return dias <= 7 ? 'PROXIMA' : 'EM_DIA';
}

/** Texto curto do prazo, para a coluna da grade. */
export function rotuloPrazo(t: Tarefa): string {
  if (t.status === 'CONCLUIDA') return 'Concluída';
  if (t.status === 'CANCELADA') return 'Cancelada';
  const dias = diasAte(t.prazoLegal);
  if (dias < 0) return `atrasada há ${Math.abs(dias)}d`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias}d`;
}

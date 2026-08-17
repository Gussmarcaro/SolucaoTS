import type { PrioridadeTarefa, StatusTarefa } from '@/core/tarefa/Tarefa';

export interface CriarTarefaDTO {
  titulo: string;
  descricao?: string | null;
  prioridade?: string | null;
  prazoLegal: string;
  ajusteId?: string | null;
  responsavelId?: string | null;
  status?: string | null;
  /**
   * Chave do alerta que originou a tarefa. Vem do sino; nunca é digitada.
   * Repetir a mesma chave não cria segunda tarefa — ver `CriarTarefaUseCase`.
   */
  origemAlerta?: string | null;
}

export type AtualizarTarefaDTO = CriarTarefaDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosTarefa {
  titulo: string;
  descricao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazoLegal: Date;
  ajusteId: string | null;
  responsavelId: string | null;
  origemAlerta: string | null;
  /** Preenchido quando o status entra em CONCLUIDA; limpo quando sai. */
  concluidaEm: Date | null;
}

export interface FiltrosTarefa {
  status?: StatusTarefa;
  prioridade?: PrioridadeTarefa;
  ajusteId?: string;
  responsavelId?: string;
  /** Só as que ainda pedem ação (PENDENTE ou EM_ANDAMENTO). */
  abertas?: boolean;
  /** Só as vencidas e ainda abertas. */
  atrasadas?: boolean;
}

export interface ListarTarefasParams {
  filtros: FiltrosTarefa;
  busca?: string;
  ordem?: { campo: string; direcao: 'asc' | 'desc' };
  page: number;
  pageSize: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

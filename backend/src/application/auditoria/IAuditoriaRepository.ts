import type { AcaoAuditoria, RegistroAuditoria } from '@/core/auditoria/RegistroAuditoria';

export interface FiltrosAuditoria {
  entidade?: string;
  registroId?: string;
  usuarioId?: string;
  /** Busca parcial na descrição do registro. */
  busca?: string;
  acao?: AcaoAuditoria;
  /** Início e fim do período, em 'YYYY-MM-DD'. */
  de?: string;
  ate?: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Port de consulta da trilha. Só leitura — a gravação é feita pela extension
 * do Prisma Client, e a tabela é append-only.
 */
export interface IAuditoriaRepository {
  listar(params: {
    filtros: FiltrosAuditoria;
    page: number;
    pageSize: number;
  }): Promise<Paginado<RegistroAuditoria>>;

  /** Histórico de um registro específico, do mais recente para o mais antigo. */
  historico(entidade: string, registroId: string): Promise<RegistroAuditoria[]>;

  /** Entidades já presentes na trilha, para alimentar o filtro da tela. */
  entidadesRegistradas(): Promise<string[]>;
}

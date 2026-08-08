import type { RegistroAuditoria, AcaoAuditoria } from '@/core/auditoria/RegistroAuditoria';
import type { FiltrosAuditoria, IAuditoriaRepository, Paginado } from './IAuditoriaRepository';

const PAGE_SIZE_PADRAO = 25;
const PAGE_SIZE_MAX = 100;

const ACOES: AcaoAuditoria[] = ['ALTERACAO', 'EXCLUSAO', 'INATIVACAO', 'REATIVACAO', 'CRIACAO'];

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Consulta da trilha de auditoria. Não há caso de uso de escrita: a trilha é
 * append-only e alimentada pela camada de dados. */
export class ConsultarAuditoriaUseCase {
  constructor(private readonly repo: IAuditoriaRepository) {}

  async listar(params: {
    entidade?: string;
    registroId?: string;
    usuarioId?: string;
    acao?: string;
    de?: string;
    ate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<RegistroAuditoria>> {
    const filtros: FiltrosAuditoria = {};
    if (params.entidade?.trim()) filtros.entidade = params.entidade.trim();
    if (params.registroId?.trim()) filtros.registroId = params.registroId.trim();
    if (params.usuarioId?.trim()) filtros.usuarioId = params.usuarioId.trim();
    if (params.acao && ACOES.includes(params.acao as AcaoAuditoria)) filtros.acao = params.acao as AcaoAuditoria;
    if (params.de && DATA_ISO.test(params.de)) filtros.de = params.de;
    if (params.ate && DATA_ISO.test(params.ate)) filtros.ate = params.ate;

    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)));

    return this.repo.listar({ filtros, page, pageSize });
  }

  async historico(entidade: string, registroId: string): Promise<RegistroAuditoria[]> {
    if (!entidade?.trim() || !registroId?.trim()) return [];
    return this.repo.historico(entidade.trim(), registroId.trim());
  }

  async entidades(): Promise<string[]> {
    return this.repo.entidadesRegistradas();
  }
}

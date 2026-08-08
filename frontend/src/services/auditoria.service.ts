import { http } from './http';
import type { RegistroAuditoria } from '@/types/auditoria';
import type { Paginado } from '@/types/empresa';

export interface FiltrosAuditoria {
  entidade?: string;
  usuarioId?: string;
  acao?: string;
  de?: string;
  ate?: string;
}

export const auditoriaApi = {
  async listar(params: FiltrosAuditoria & { page?: number; pageSize?: number }) {
    const { data } = await http.get<Paginado<RegistroAuditoria>>('/auditoria', { params });
    return data;
  },

  /** Linha do tempo de um registro — usada no botão "Histórico" dos cadastros. */
  async historico(entidade: string, registroId: string): Promise<RegistroAuditoria[]> {
    const { data } = await http.get<RegistroAuditoria[]>(`/auditoria/${entidade}/${registroId}`);
    return data;
  },

  /** Entidades já presentes na trilha, para o filtro da tela. */
  async entidades(): Promise<string[]> {
    const { data } = await http.get<{ itens: string[] }>('/auditoria/entidades');
    return data.itens;
  },
};

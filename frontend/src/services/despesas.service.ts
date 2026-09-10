import { http } from './http';
import type { DocumentoFiscal, DocumentoFiscalPayload } from '@/types/prestacaoBlocos';

/**
 * Despesas — os documentos fiscais do órgão.
 *
 * Rota própria, sem `prestacaoId`: a nota é lançada quando a despesa acontece,
 * e a prestação depois se apropria dela. É a mesma entidade que a aba da
 * prestação mostra, vista do escopo de cima.
 */
export const despesasApi = {
  listar: async (): Promise<DocumentoFiscal[]> => {
    const { data } = await http.get<DocumentoFiscal[]>('/despesas');
    return data;
  },
  criar: async (payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> => {
    const { data } = await http.post<DocumentoFiscal>('/despesas', payload);
    return data;
  },
  atualizar: async (id: string, payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> => {
    const { data } = await http.put<DocumentoFiscal>(`/despesas/${id}`, payload);
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/despesas/${id}`);
  },
};

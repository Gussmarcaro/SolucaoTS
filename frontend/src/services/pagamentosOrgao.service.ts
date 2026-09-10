import { http } from './http';
import type { Pagamento, PagamentoPayload } from '@/types/prestacaoBlocos';

/**
 * Pagamentos do órgão — Execução → Financeiro.
 *
 * Rota sem `prestacaoId`: o pagamento existe antes de qualquer prestação se
 * apropriar dele. É a mesma entidade da aba da prestação, vista de cima.
 */
export const pagamentosOrgaoApi = {
  listar: async (): Promise<Pagamento[]> => {
    const { data } = await http.get<Pagamento[]>('/pagamentos');
    return data;
  },
  criar: async (payload: PagamentoPayload): Promise<Pagamento> => {
    const { data } = await http.post<Pagamento>('/pagamentos', payload);
    return data;
  },
  atualizar: async (id: string, payload: PagamentoPayload): Promise<Pagamento> => {
    const { data } = await http.put<Pagamento>(`/pagamentos/${id}`, payload);
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/pagamentos/${id}`);
  },
};

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
  /**
   * Pagamento de nota rateada: **um lançamento por ajuste, de uma vez**.
   *
   * O valor não vai no payload — sai do quadro do rateio aplicado ao líquido
   * da nota, no servidor. Mandá-lo daqui permitiria pagar 500 num ajuste que o
   * rateio diz ser 600, e nada acusaria.
   */
  ratear: async (payload: Omit<PagamentoPayload, 'valor'> & { documentoFiscalId: string }): Promise<Pagamento[]> => {
    const { data } = await http.post<Pagamento[]>('/pagamentos/ratear', payload);
    return data;
  },
};

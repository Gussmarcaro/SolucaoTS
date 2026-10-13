import { http } from './http';
import type { Pagamento, PagamentoPayload } from '@/types/prestacaoBlocos';

/**
 * Pagamentos do órgão — Execução → Financeiro.
 *
 * Rota sem `prestacaoId`: o pagamento existe antes de qualquer prestação se
 * apropriar dele. É a mesma entidade da aba da prestação, vista de cima.
 */
export const pagamentosOrgaoApi = {
  /**
   * Com `ajusteId`, só os daquela parceria; com `documentoFiscalId`, só os
   * daquela nota — **de todos os ajustes**.
   *
   * Os dois recortes respondem perguntas opostas, e por isso convivem. A grade
   * mostra o que é da parceria em execução; o formulário precisa saber quanto
   * a **nota** já tem pago, e a rateada é paga por vários ajustes: somar só o
   * que a grade mostra daria um saldo maior que o real, e a tela prometeria um
   * teto que o servidor recusa.
   */
  listar: async (filtros?: { ajusteId?: string; documentoFiscalId?: string }): Promise<Pagamento[]> => {
    const { data } = await http.get<Pagamento[]>('/pagamentos', {
      params: {
        ...(filtros?.ajusteId ? { ajusteId: filtros.ajusteId } : {}),
        ...(filtros?.documentoFiscalId ? { documentoFiscalId: filtros.documentoFiscalId } : {}),
      },
    });
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

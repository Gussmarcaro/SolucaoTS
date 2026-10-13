import { http } from './http';
import type { ContaBancaria, ContaBancariaPayload } from '@/types/contaBancaria';

/**
 * Cadastro de contas bancárias do órgão.
 *
 * `listar(true)` é o que os combos pedem: conta inativa não deve ser oferecida
 * para uso novo, mas continua visível no cadastro e no que já a cita.
 */
export const contasApi = {
  /**
   * As contas do órgão. Com `ajusteId`, **só as declaradas naquele ajuste**.
   *
   * É o que as telas de Execução pedem: elas operam dentro de uma parceria, e
   * oferecer a conta de outra é exatamente o erro que o portão da Execução
   * existe para impedir — lançamento na conta errada é indistinguível de um
   * lançamento certo até alguém conferir extrato por extrato.
   */
  listar: async (apenasAtivas = false, ajusteId?: string): Promise<ContaBancaria[]> => {
    const { data } = await http.get<ContaBancaria[]>('/contas-bancarias', {
      params: {
        ...(apenasAtivas ? { ativas: 'true' } : {}),
        ...(ajusteId ? { ajusteId } : {}),
      },
    });
    return data;
  },
  criar: async (payload: ContaBancariaPayload): Promise<ContaBancaria> => {
    const { data } = await http.post<ContaBancaria>('/contas-bancarias', payload);
    return data;
  },
  atualizar: async (id: string, payload: ContaBancariaPayload): Promise<ContaBancaria> => {
    const { data } = await http.put<ContaBancaria>(`/contas-bancarias/${id}`, payload);
    return data;
  },
  definirAtivo: async (id: string, ativo: boolean): Promise<ContaBancaria> => {
    const { data } = await http.patch<ContaBancaria>(`/contas-bancarias/${id}/status`, { ativo });
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/contas-bancarias/${id}`);
  },
};

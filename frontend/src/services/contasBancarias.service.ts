import { http } from './http';
import type { ContaBancaria, ContaBancariaPayload } from '@/types/contaBancaria';

/**
 * Cadastro de contas bancárias do órgão.
 *
 * `listar(true)` é o que os combos pedem: conta inativa não deve ser oferecida
 * para uso novo, mas continua visível no cadastro e no que já a cita.
 */
export const contasApi = {
  listar: async (apenasAtivas = false): Promise<ContaBancaria[]> => {
    const { data } = await http.get<ContaBancaria[]>('/contas-bancarias', {
      params: apenasAtivas ? { ativas: 'true' } : undefined,
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

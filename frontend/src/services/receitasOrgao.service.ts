import { http } from './http';
import type { Receita, ReceitaPayload } from '@/types/prestacaoBlocos2';

/**
 * Receitas do órgão — Execução → Financeiro.
 *
 * Rota sem `prestacaoId`: o lançamento existe antes de qualquer prestação se
 * apropriar dele. É a mesma entidade da aba da prestação, vista de cima.
 */
export const receitasOrgaoApi = {
  listar: async (): Promise<Receita[]> => {
    const { data } = await http.get<Receita[]>('/receitas');
    return data;
  },
  criar: async (payload: ReceitaPayload): Promise<Receita> => {
    const { data } = await http.post<Receita>('/receitas', payload);
    return data;
  },
  atualizar: async (id: string, payload: ReceitaPayload): Promise<Receita> => {
    const { data } = await http.put<Receita>(`/receitas/${id}`, payload);
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/receitas/${id}`);
  },
};

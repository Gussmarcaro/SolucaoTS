import { http } from './http';
import type { GuiaPayload, GuiaRecolhimento, RetencaoApurada } from '@/types/guia';

/**
 * Guias de recolhimento das retenções.
 *
 * `apurar` devolve o painel inteiro: o calculado das notas pagas com a guia ao
 * lado, quando ela existe. Uma chamada só, porque as duas informações só fazem
 * sentido juntas.
 */
export const guiasApi = {
  apurar: async (): Promise<RetencaoApurada[]> => {
    const { data } = await http.get<RetencaoApurada[]>('/guias-recolhimento');
    return data;
  },
  criar: async (payload: GuiaPayload): Promise<GuiaRecolhimento> => {
    const { data } = await http.post<GuiaRecolhimento>('/guias-recolhimento', payload);
    return data;
  },
  atualizar: async (id: string, payload: GuiaPayload): Promise<GuiaRecolhimento> => {
    const { data } = await http.put<GuiaRecolhimento>(`/guias-recolhimento/${id}`, payload);
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/guias-recolhimento/${id}`);
  },
};

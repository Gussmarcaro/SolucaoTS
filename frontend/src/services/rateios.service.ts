import { http } from './http';
import type { Paginado } from '@/types/ajuste';
import type { MetodoRateio, Rateio, RateioPayload } from '@/types/rateio';

export interface FiltrosRateio {
  metodo?: MetodoRateio | '';
  ativo?: boolean;
  /** Só os vigentes nesta data ('YYYY-MM-DD'). */
  vigenteEm?: string;
}

export async function listarRateios(params: {
  filtros?: FiltrosRateio;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Rateio>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Rateio>>('/rateios', {
    params: {
      ...filtros,
      metodo: filtros.metodo || undefined,
      busca: busca || undefined,
      orderBy,
      orderDir,
      page,
      pageSize,
    },
  });
  return data;
}

export async function buscarRateio(id: string): Promise<Rateio> {
  const { data } = await http.get<Rateio>(`/rateios/${id}`);
  return data;
}

export async function criarRateio(payload: RateioPayload): Promise<Rateio> {
  const { data } = await http.post<Rateio>('/rateios', payload);
  return data;
}

export async function atualizarRateio(id: string, payload: RateioPayload): Promise<Rateio> {
  const { data } = await http.put<Rateio>(`/rateios/${id}`, payload);
  return data;
}

export async function definirAtivoRateio(id: string, ativo: boolean): Promise<Rateio> {
  const { data } = await http.patch<Rateio>(`/rateios/${id}/ativo`, { ativo });
  return data;
}

export async function excluirRateio(id: string): Promise<void> {
  await http.delete(`/rateios/${id}`);
}

/**
 * Ids dos ajustes vigentes na data — o carregamento automático do quadro.
 *
 * Devolve só os ids: os dados de exibição vêm da listagem de ajustes, que a
 * tela já carrega para o lookup. Duplicar aqui daria duas fontes para o mesmo
 * código de ajuste.
 */
export async function ajustesVigentes(em?: string): Promise<{ id: string }[]> {
  const { data } = await http.get<{ id: string }[]>('/rateios/ajustes-vigentes', {
    params: { em: em || undefined },
  });
  return data;
}

import { http } from './http';
import type { Ajuste, AjustePayload, FiltrosAjuste, Paginado } from '@/types/ajuste';

export async function listarAjustes(params: {
  filtros?: FiltrosAjuste;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Ajuste>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Ajuste>>('/ajustes', {
    params: {
      ...filtros,
      busca: busca || undefined,
      orderBy: orderBy || undefined,
      orderDir: orderDir || undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function buscarAjuste(id: string): Promise<Ajuste> {
  const { data } = await http.get<Ajuste>(`/ajustes/${id}`);
  return data;
}

export async function criarAjuste(payload: AjustePayload): Promise<Ajuste> {
  const { data } = await http.post<Ajuste>('/ajustes', payload);
  return data;
}

export async function atualizarAjuste(id: string, payload: AjustePayload): Promise<Ajuste> {
  const { data } = await http.put<Ajuste>(`/ajustes/${id}`, payload);
  return data;
}

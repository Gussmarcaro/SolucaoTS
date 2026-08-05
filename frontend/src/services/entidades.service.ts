import { http } from './http';
import type { Entidade, EntidadePayload, FiltrosEntidade, Paginado } from '@/types/entidade';

export async function listarEntidades(params: {
  filtros?: FiltrosEntidade;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Entidade>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Entidade>>('/entidades', {
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

export async function buscarEntidade(id: string): Promise<Entidade> {
  const { data } = await http.get<Entidade>(`/entidades/${id}`);
  return data;
}

export async function criarEntidade(payload: EntidadePayload): Promise<Entidade> {
  const { data } = await http.post<Entidade>('/entidades', payload);
  return data;
}

export async function atualizarEntidade(id: string, payload: EntidadePayload): Promise<Entidade> {
  const { data } = await http.put<Entidade>(`/entidades/${id}`, payload);
  return data;
}

export async function definirStatusEntidade(id: string, ativo: boolean): Promise<Entidade> {
  const { data } = await http.patch<Entidade>(`/entidades/${id}/status`, { ativo });
  return data;
}

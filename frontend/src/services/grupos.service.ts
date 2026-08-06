import { http } from './http';
import type { FiltrosGrupo, Grupo, GrupoPayload, GrupoResumo, Paginado } from '@/types/grupo';

export async function listarGrupos(params: {
  filtros?: FiltrosGrupo;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Grupo>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Grupo>>('/grupos', {
    params: { ...filtros, busca: busca || undefined, orderBy: orderBy || undefined, orderDir: orderDir || undefined, page, pageSize },
  });
  return data;
}

export async function listarGruposAtivos(): Promise<GrupoResumo[]> {
  const { data } = await http.get<GrupoResumo[]>('/grupos/ativos');
  return data;
}

export async function buscarGrupo(id: string): Promise<Grupo> {
  const { data } = await http.get<Grupo>(`/grupos/${id}`);
  return data;
}

export async function criarGrupo(payload: GrupoPayload): Promise<Grupo> {
  const { data } = await http.post<Grupo>('/grupos', payload);
  return data;
}

export async function atualizarGrupo(id: string, payload: GrupoPayload): Promise<Grupo> {
  const { data } = await http.put<Grupo>(`/grupos/${id}`, payload);
  return data;
}

export async function definirStatusGrupo(id: string, ativo: boolean): Promise<Grupo> {
  const { data } = await http.patch<Grupo>(`/grupos/${id}/status`, { ativo });
  return data;
}

export async function excluirGrupo(id: string): Promise<void> {
  await http.delete(`/grupos/${id}`);
}

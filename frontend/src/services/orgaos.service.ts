import { http } from './http';
import type { FiltrosOrgao, Orgao, OrgaoPayload, Paginado } from '@/types/orgao';

export async function listarOrgaos(params: {
  filtros?: FiltrosOrgao;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Orgao>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Orgao>>('/orgaos', {
    params: { ...filtros, busca: busca || undefined, orderBy: orderBy || undefined, orderDir: orderDir || undefined, page, pageSize },
  });
  return data;
}

export async function buscarOrgao(id: string): Promise<Orgao> {
  const { data } = await http.get<Orgao>(`/orgaos/${id}`);
  return data;
}

export async function criarOrgao(payload: OrgaoPayload): Promise<Orgao> {
  const { data } = await http.post<Orgao>('/orgaos', payload);
  return data;
}

export async function atualizarOrgao(id: string, payload: OrgaoPayload): Promise<Orgao> {
  const { data } = await http.put<Orgao>(`/orgaos/${id}`, payload);
  return data;
}

export async function definirStatusOrgao(id: string, ativo: boolean): Promise<Orgao> {
  const { data } = await http.patch<Orgao>(`/orgaos/${id}/status`, { ativo });
  return data;
}

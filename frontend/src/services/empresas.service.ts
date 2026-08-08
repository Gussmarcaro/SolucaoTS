import { http } from './http';
import type { Empresa, EmpresaPayload, FiltrosEmpresa, Paginado } from '@/types/empresa';

export async function listarEmpresas(params: {
  filtros?: FiltrosEmpresa;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Empresa>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Empresa>>('/empresas', {
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

export async function buscarEmpresa(id: string): Promise<Empresa> {
  const { data } = await http.get<Empresa>(`/empresas/${id}`);
  return data;
}

export async function criarEmpresa(payload: EmpresaPayload): Promise<Empresa> {
  const { data } = await http.post<Empresa>('/empresas', payload);
  return data;
}

export async function atualizarEmpresa(id: string, payload: EmpresaPayload): Promise<Empresa> {
  const { data } = await http.put<Empresa>(`/empresas/${id}`, payload);
  return data;
}

export async function definirStatusEmpresa(id: string, ativo: boolean): Promise<Empresa> {
  const { data } = await http.patch<Empresa>(`/empresas/${id}/status`, { ativo });
  return data;
}

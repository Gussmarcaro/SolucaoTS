import { http } from './http';
import type { Empresa, EmpresaPayload, FiltrosEmpresa, Paginado } from '@/types/empresa';

/** Resolve a URL do logo (relativa da API) para exibição no frontend. */
export function resolverUrlLogo(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//.test(logoUrl)) return logoUrl;
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
  return `${base}${logoUrl}`;
}

export async function listarEmpresas(params: {
  filtros?: FiltrosEmpresa;
  busca?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Empresa>> {
  const { filtros = {}, busca, page, pageSize } = params;
  const { data } = await http.get<Paginado<Empresa>>('/empresas', {
    params: { ...filtros, busca: busca || undefined, page, pageSize },
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

/** Envia o logotipo (multipart) de uma empresa existente e retorna a URL gravada. */
export async function enviarLogo(id: string, arquivo: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append('file', arquivo);
  const { data } = await http.post<{ logoUrl: string }>(`/empresas/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

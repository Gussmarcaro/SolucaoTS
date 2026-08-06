import { http } from './http';
import type { Contrato, ContratoPayload, FiltrosContrato, Paginado } from '@/types/contrato';

export async function listarContratos(params: {
  filtros?: FiltrosContrato;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Contrato>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Contrato>>('/contratos', {
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

export async function buscarContrato(id: string): Promise<Contrato> {
  const { data } = await http.get<Contrato>(`/contratos/${id}`);
  return data;
}

export async function criarContrato(payload: ContratoPayload): Promise<Contrato> {
  const { data } = await http.post<Contrato>('/contratos', payload);
  return data;
}

export async function atualizarContrato(id: string, payload: ContratoPayload): Promise<Contrato> {
  const { data } = await http.put<Contrato>(`/contratos/${id}`, payload);
  return data;
}

export async function definirStatusContrato(id: string, ativo: boolean): Promise<Contrato> {
  const { data } = await http.patch<Contrato>(`/contratos/${id}/status`, { ativo });
  return data;
}

import { http } from './http';
import type { BemCedido, BemCedidoPayload, FiltrosBemCedido, Paginado } from '@/types/bemCedido';

export async function listarBensCedidos(params: {
  filtros?: FiltrosBemCedido;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<BemCedido>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<BemCedido>>('/bens-cedidos', {
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

export async function buscarBemCedido(id: string): Promise<BemCedido> {
  const { data } = await http.get<BemCedido>(`/bens-cedidos/${id}`);
  return data;
}

export async function criarBemCedido(payload: BemCedidoPayload): Promise<BemCedido> {
  const { data } = await http.post<BemCedido>('/bens-cedidos', payload);
  return data;
}

export async function atualizarBemCedido(id: string, payload: BemCedidoPayload): Promise<BemCedido> {
  const { data } = await http.put<BemCedido>(`/bens-cedidos/${id}`, payload);
  return data;
}

export async function definirStatusBemCedido(id: string, ativo: boolean): Promise<BemCedido> {
  const { data } = await http.patch<BemCedido>(`/bens-cedidos/${id}/status`, { ativo });
  return data;
}

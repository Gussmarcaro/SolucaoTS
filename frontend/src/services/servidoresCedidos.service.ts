import { http } from './http';
import type {
  ServidorCedido,
  ServidorCedidoPayload,
  FiltrosServidorCedido,
  Paginado,
} from '@/types/servidorCedido';

export async function listarServidoresCedidos(params: {
  filtros?: FiltrosServidorCedido;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<ServidorCedido>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<ServidorCedido>>('/servidores-cedidos', {
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

export async function buscarServidorCedido(id: string): Promise<ServidorCedido> {
  const { data } = await http.get<ServidorCedido>(`/servidores-cedidos/${id}`);
  return data;
}

export async function criarServidorCedido(payload: ServidorCedidoPayload): Promise<ServidorCedido> {
  const { data } = await http.post<ServidorCedido>('/servidores-cedidos', payload);
  return data;
}

export async function atualizarServidorCedido(
  id: string,
  payload: ServidorCedidoPayload,
): Promise<ServidorCedido> {
  const { data } = await http.put<ServidorCedido>(`/servidores-cedidos/${id}`, payload);
  return data;
}

export async function definirStatusServidorCedido(
  id: string,
  ativo: boolean,
): Promise<ServidorCedido> {
  const { data } = await http.patch<ServidorCedido>(`/servidores-cedidos/${id}/status`, { ativo });
  return data;
}

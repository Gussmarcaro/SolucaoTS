import { http } from './http';
import type {
  Fornecedor,
  FornecedorPayload,
  FiltrosFornecedor,
  Paginado,
} from '@/types/fornecedor';

export async function listarFornecedores(params: {
  filtros?: FiltrosFornecedor;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Fornecedor>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Fornecedor>>('/fornecedores', {
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

export async function buscarFornecedor(id: string): Promise<Fornecedor> {
  const { data } = await http.get<Fornecedor>(`/fornecedores/${id}`);
  return data;
}

export async function criarFornecedor(payload: FornecedorPayload): Promise<Fornecedor> {
  const { data } = await http.post<Fornecedor>('/fornecedores', payload);
  return data;
}

export async function atualizarFornecedor(
  id: string,
  payload: FornecedorPayload,
): Promise<Fornecedor> {
  const { data } = await http.put<Fornecedor>(`/fornecedores/${id}`, payload);
  return data;
}

export async function definirStatusFornecedor(id: string, ativo: boolean): Promise<Fornecedor> {
  const { data } = await http.patch<Fornecedor>(`/fornecedores/${id}/status`, { ativo });
  return data;
}

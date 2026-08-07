import { http } from './http';
import type {
  CriarPrestacaoPayload,
  FiltrosPrestacao,
  Paginado,
  Prestacao,
} from '@/types/prestacao';

export async function listarPrestacoes(params: {
  filtros?: FiltrosPrestacao;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Prestacao>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Prestacao>>('/prestacoes', {
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

export async function buscarPrestacao(id: string): Promise<Prestacao> {
  const { data } = await http.get<Prestacao>(`/prestacoes/${id}`);
  return data;
}

export async function criarPrestacao(payload: CriarPrestacaoPayload): Promise<Prestacao> {
  const { data } = await http.post<Prestacao>('/prestacoes', payload);
  return data;
}

export async function excluirPrestacao(id: string): Promise<void> {
  await http.delete(`/prestacoes/${id}`);
}

export interface ResultadoJson {
  documento: unknown;
  avisos: string[];
}

export async function gerarJsonPrestacao(id: string): Promise<ResultadoJson> {
  const { data } = await http.get<ResultadoJson>(`/prestacoes/${id}/json`);
  return data;
}

import { http } from './http';
import type {
  Colaborador,
  ColaboradorPayload,
  FiltrosColaborador,
  Paginado,
} from '@/types/colaborador';

export async function listarColaboradores(params: {
  filtros?: FiltrosColaborador;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Colaborador>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Colaborador>>('/colaboradores', {
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

export async function buscarColaborador(id: string): Promise<Colaborador> {
  const { data } = await http.get<Colaborador>(`/colaboradores/${id}`);
  return data;
}

export async function criarColaborador(payload: ColaboradorPayload): Promise<Colaborador> {
  const { data } = await http.post<Colaborador>('/colaboradores', payload);
  return data;
}

export async function atualizarColaborador(
  id: string,
  payload: ColaboradorPayload,
): Promise<Colaborador> {
  const { data } = await http.put<Colaborador>(`/colaboradores/${id}`, payload);
  return data;
}

export async function definirStatusColaborador(id: string, ativo: boolean): Promise<Colaborador> {
  const { data } = await http.patch<Colaborador>(`/colaboradores/${id}/status`, { ativo });
  return data;
}

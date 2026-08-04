import { http } from './http';
import type {
  AtualizarUsuarioPayload,
  CriarUsuarioPayload,
  FiltrosUsuario,
  Paginado,
  Usuario,
} from '@/types/usuario';

export async function criarUsuario(payload: CriarUsuarioPayload): Promise<Usuario> {
  const { data } = await http.post<Usuario>('/usuarios', payload);
  return data;
}

export async function atualizarUsuario(
  id: string,
  payload: AtualizarUsuarioPayload,
): Promise<Usuario> {
  const { data } = await http.put<Usuario>(`/usuarios/${id}`, payload);
  return data;
}

export async function definirStatusUsuario(id: string, ativo: boolean): Promise<Usuario> {
  const { data } = await http.patch<Usuario>(`/usuarios/${id}/status`, { ativo });
  return data;
}

export async function listarUsuarios(params: {
  filtros?: FiltrosUsuario;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Usuario>> {
  const { data } = await http.get<Paginado<Usuario>>('/usuarios', {
    params: {
      ...params.filtros,
      busca: params.busca || undefined,
      orderBy: params.orderBy || undefined,
      orderDir: params.orderDir || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return data;
}

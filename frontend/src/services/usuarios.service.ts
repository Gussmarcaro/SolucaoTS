import { http } from './http';
import type {
  CriarUsuarioPayload,
  FiltrosUsuario,
  Paginado,
  Usuario,
} from '@/types/usuario';

export async function criarUsuario(payload: CriarUsuarioPayload): Promise<Usuario> {
  const { data } = await http.post<Usuario>('/usuarios', payload);
  return data;
}

export async function listarUsuarios(params: {
  filtros?: FiltrosUsuario;
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Usuario>> {
  const { data } = await http.get<Paginado<Usuario>>('/usuarios', {
    params: { ...params.filtros, page: params.page, pageSize: params.pageSize },
  });
  return data;
}

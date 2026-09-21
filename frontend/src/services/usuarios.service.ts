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

/**
 * A foto do usuário.
 *
 * Duas famílias de rota, e a diferença importa: `/perfil/foto` é a própria
 * foto e não exige permissão nenhuma — o id sai do token. `/usuarios/:id/foto`
 * é a foto de outra pessoa, e passa pelo gate de CONFIG_USUARIOS.
 */
export async function enviarMinhaFoto(arquivo: File): Promise<Usuario> {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  const { data } = await http.post<Usuario>('/perfil/foto', dados);
  return data;
}

export async function removerMinhaFoto(): Promise<Usuario> {
  const { data } = await http.delete<Usuario>('/perfil/foto');
  return data;
}

export async function enviarFotoUsuario(id: string, arquivo: File): Promise<Usuario> {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  const { data } = await http.post<Usuario>(`/usuarios/${id}/foto`, dados);
  return data;
}

export async function removerFotoUsuario(id: string): Promise<Usuario> {
  const { data } = await http.delete<Usuario>(`/usuarios/${id}/foto`);
  return data;
}

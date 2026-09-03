import { http } from './http';
import type { AtualizarPerfilPayload, Usuario } from '@/types/usuario';

/**
 * "Meu Perfil" — rota própria, e não `/usuarios/:id`.
 *
 * A do cadastro exige `CONFIG_USUARIOS`, permissão de quem administra os
 * usuários do órgão. Trocar a própria senha não pode custar isso.
 */
export async function meuPerfil(): Promise<Usuario> {
  const { data } = await http.get<Usuario>('/perfil');
  return data;
}

export async function atualizarMeuPerfil(payload: AtualizarPerfilPayload): Promise<Usuario> {
  const { data } = await http.put<Usuario>('/perfil', payload);
  return data;
}

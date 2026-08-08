export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  /** Nome do grupo de acesso; null se o usuário não tem grupo. */
  grupo: string | null;
}

export interface LoginPayload {
  email: string;
  senha: string;
  lembrar?: boolean;
}

export interface LoginResposta {
  token: string;
  usuario: UsuarioAutenticado;
}

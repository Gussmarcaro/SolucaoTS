export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
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

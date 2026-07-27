export interface LoginDTO {
  email: string;
  senha: string;
  lembrar?: boolean;
}

export interface LoginResultado {
  token: string;
  usuario: { id: string; nome: string; email: string };
}

export interface SolicitarRecuperacaoDTO {
  email: string;
}

export interface RedefinirSenhaDTO {
  token: string;
  senha: string;
  confirmarSenha: string;
}

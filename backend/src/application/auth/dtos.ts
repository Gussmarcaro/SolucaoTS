export interface LoginDTO {
  email: string;
  senha: string;
  lembrar?: boolean;
}

export interface LoginResultado {
  token: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    grupo: string | null;
    /** Órgão do usuário; null enquanto o backfill do multi-tenant não rodou. */
    clienteId: string | null;
  };
}

export interface SolicitarRecuperacaoDTO {
  email: string;
}

export interface RedefinirSenhaDTO {
  token: string;
  senha: string;
  confirmarSenha: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  /** Nome do grupo de acesso; null se o usuário não tem grupo. */
  grupo: string | null;
  /** Órgão em que a sessão está operando; null antes do backfill. */
  clienteId?: string | null;
  /** Nome do órgão em atendimento — só o suporte troca de órgão. */
  orgaoNome?: string | null;
  /** Equipe do fornecedor: provisiona órgãos e escolhe qual atender. */
  suporte?: boolean;
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

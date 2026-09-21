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
  /**
   * Carimbo da última troca de foto; null quando não há foto.
   *
   * Fica na sessão e **não** no token: o token não se reemite quando a pessoa
   * troca a foto, e o avatar da barra ficaria velho até o próximo login. Quem
   * o atualiza é `atualizarSessao`, na tela do perfil.
   */
  fotoVersao?: string | null;
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

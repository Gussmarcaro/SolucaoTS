import jwt, { type SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-troque-em-producao';
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h';
const JWT_EXPIRES_REMEMBER = process.env.JWT_EXPIRES_REMEMBER ?? '30d';

export interface TokenPayload {
  sub: string; // id do usuário
  nome: string;
  email: string;
  /**
   * Nome do grupo de acesso. Vai no token para o front decidir o que exibir
   * sem uma ida extra ao servidor — mas quem barra o acesso é o middleware
   * `exigirGrupo`, não a interface.
   *
   * Ausente em tokens emitidos antes desta versão: quem estiver logado precisa
   * entrar de novo para o grupo passar a valer.
   */
  grupo?: string | null;
}

/** Assina um JWT. Com "lembrar de mim", usa expiração estendida. */
export function assinarToken(payload: TokenPayload, lembrar = false): string {
  const options: SignOptions = {
    expiresIn: (lembrar ? JWT_EXPIRES_REMEMBER : JWT_EXPIRES) as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/** Verifica e decodifica um JWT. Lança se inválido/expirado. */
export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

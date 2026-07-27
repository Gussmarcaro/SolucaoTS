import { createHash, randomBytes } from 'node:crypto';

const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN ?? 30);

export interface ResetTokenGerado {
  /** Token puro — enviado ao usuário por e-mail (nunca armazenado). */
  token: string;
  /** Hash SHA-256 do token — o que é gravado no banco. */
  tokenHash: string;
  /** Data de expiração. */
  expiresAt: Date;
}

/** Calcula o hash SHA-256 de um token (usado para gravar e para comparar). */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Gera um token de recuperação seguro (256 bits) com validade configurável. */
export function gerarResetToken(): ResetTokenGerado {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);
  return { token, tokenHash: hashResetToken(token), expiresAt };
}

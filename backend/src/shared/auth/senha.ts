import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/** Gera o hash bcrypt de uma senha em texto puro. */
export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

/** Compara uma senha em texto puro com o hash armazenado. */
export function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export interface RequisitosSenha {
  tamanho: boolean; // mín. 8
  maiuscula: boolean;
  numero: boolean;
  especial: boolean;
}

/** Avalia os requisitos de força de senha. */
export function avaliarSenha(senha: string): RequisitosSenha {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    numero: /\d/.test(senha),
    especial: /[^A-Za-z0-9]/.test(senha),
  };
}

/** Senha forte: mín. 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial. */
export function isSenhaForte(senha: string): boolean {
  const r = avaliarSenha(senha);
  return r.tamanho && r.maiuscula && r.numero && r.especial;
}

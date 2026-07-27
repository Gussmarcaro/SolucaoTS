import { apenasDigitos } from './masks';

/** Valida CPF (11 dígitos) pelos dígitos verificadores. */
export function isCpfValido(cpf: string): boolean {
  const c = apenasDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(c.slice(0, 9), 10) === Number(c[9]) && calc(c.slice(0, 10), 11) === Number(c[10]);
}

/** Valida CNPJ (14 dígitos) pelos dígitos verificadores. */
export function isCnpjValido(cnpj: string): boolean {
  const c = apenasDigitos(cnpj);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(c.slice(0, 12)) === Number(c[12]) && calc(c.slice(0, 13)) === Number(c[13]);
}

/** Valida documento conforme o tamanho (CPF ou CNPJ). */
export function isDocumentoValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  return d.length > 11 ? isCnpjValido(d) : isCpfValido(d);
}

/** Valida formato de e-mail. */
export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface RequisitosSenha {
  tamanho: boolean; // mín. 8
  maiuscula: boolean;
  numero: boolean;
  especial: boolean;
}

/** Avalia os requisitos de força de senha (espelha a regra do backend). */
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

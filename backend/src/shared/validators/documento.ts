/** Remove tudo que não é dígito. */
export function apenasDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Valida um CPF (11 dígitos) pelos dígitos verificadores. */
export function isCPFValido(cpf: string): boolean {
  const c = apenasDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;

  const calcDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = calcDigito(c.slice(0, 9), 10);
  const d2 = calcDigito(c.slice(0, 10), 11);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

/** Valida um CNPJ (14 dígitos) pelos dígitos verificadores. */
export function isCNPJValido(cnpj: string): boolean {
  const c = apenasDigitos(cnpj);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

  const calcDigito = (base: string): number => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcDigito(c.slice(0, 12));
  const d2 = calcDigito(c.slice(0, 13));
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

/** Valida documento conforme o tipo informado. */
export function isDocumentoValido(documento: string, tipo: 'CPF' | 'CNPJ'): boolean {
  return tipo === 'CPF' ? isCPFValido(documento) : isCNPJValido(documento);
}

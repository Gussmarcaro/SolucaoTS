/** Remove tudo que não é dígito. */
export function apenasDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Máscara dinâmica de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). */
export function mascaraCpfCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Detecta se o documento (por quantidade de dígitos) é CPF ou CNPJ. */
export function tipoDocumento(valor: string): 'CPF' | 'CNPJ' {
  return apenasDigitos(valor).length > 11 ? 'CNPJ' : 'CPF';
}

/** Máscara de CEP (00000-000). */
export function mascaraCep(valor: string): string {
  return apenasDigitos(valor)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/** Máscara de celular (00) 00000-0000 — também aceita fixo (00) 0000-0000. */
export function mascaraCelular(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Máscara de telefone fixo (00) 0000-0000. */
export function mascaraTelefoneFixo(valor: string): string {
  return apenasDigitos(valor)
    .slice(0, 10)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
}

/**
 * Máscara de Inscrição Estadual — o formato varia por UF, então aplicamos
 * apenas dígitos (aceitando também "ISENTO"). Máx. 14 dígitos.
 */
export function mascaraInscricao(valor: string): string {
  if (/isento/i.test(valor)) return 'ISENTO';
  return apenasDigitos(valor).slice(0, 14);
}

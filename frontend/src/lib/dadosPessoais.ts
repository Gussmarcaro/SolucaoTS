import { apenasDigitos, mascaraCpf, mascaraCpfCnpj } from './masks';

/**
 * Ocultação de dados pessoais na tela (LGPD, art. 6º, III — necessidade).
 *
 * A regra aqui é minimizar o que aparece sem que ninguém tenha pedido: uma
 * listagem não precisa expor o CPF inteiro de dezenas de pessoas para alguém
 * conferir um registro. Ficam visíveis os dígitos do meio, que bastam para
 * reconhecer de quem se trata, e somem os que identificam — é a mesma convenção
 * que a Receita usa em consultas públicas.
 */

/** `123.456.789-09` → `•••.456.789-••` */
export function mascararCpf(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  if (d.length !== 11) return valor ? mascaraCpf(valor) : '—';
  return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
}

/**
 * CPF some parcialmente; CNPJ continua inteiro — é dado de pessoa jurídica, que
 * a LGPD não alcança, e é público no cadastro da Receita.
 */
export function mascararDocumento(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  if (d.length === 11) return mascararCpf(d);
  return valor ? mascaraCpfCnpj(valor) : '—';
}

/** Cartão Nacional de Saúde — dado sensível: só os quatro últimos dígitos. */
export function mascararCns(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  if (!d) return '—';
  return `••• ••• ••• ${d.slice(-4)}`;
}

/** Data de nascimento vira só o ano: identifica menos e ainda situa a idade. */
export function mascararNascimento(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `••/••/${iso.slice(0, 4)}`;
}

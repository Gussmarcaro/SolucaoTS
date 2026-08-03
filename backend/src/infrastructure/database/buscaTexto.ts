import { normalizarTexto } from '@/shared/normalizar';

/** Concatena e normaliza os campos pesquisáveis de um Usuário. */
export function buscaUsuario(u: {
  nome: string;
  documento: string;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
}): string {
  return normalizarTexto(
    [u.nome, u.documento, u.cep, u.logradouro, u.numero, u.complemento, u.bairro, u.cidade, u.uf, u.email, u.celular]
      .filter(Boolean)
      .join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de uma Empresa. */
export function buscaEmpresa(e: {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo?: string | null;
  whatsapp?: string | null;
}): string {
  return normalizarTexto(
    [
      e.razaoSocial,
      e.nomeFantasia,
      e.cnpj,
      e.cep,
      e.logradouro,
      e.numero,
      e.complemento,
      e.bairro,
      e.cidade,
      e.uf,
      e.email,
      e.telefoneFixo,
      e.whatsapp,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

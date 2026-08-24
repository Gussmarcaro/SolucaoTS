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

/** Concatena e normaliza os campos pesquisáveis de um Fornecedor. */
export function buscaFornecedor(f: {
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
  telefoneFixo?: string | null;
  whatsapp?: string | null;
}): string {
  return normalizarTexto(
    [
      f.nome, f.documento, f.cep, f.logradouro, f.numero, f.complemento,
      f.bairro, f.cidade, f.uf, f.email, f.telefoneFixo, f.whatsapp,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de uma Entidade Beneficiária. */
export function buscaEntidade(e: {
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
      e.razaoSocial, e.nomeFantasia, e.cnpj, e.cep, e.logradouro, e.numero, e.complemento,
      e.bairro, e.cidade, e.uf, e.email, e.telefoneFixo, e.whatsapp,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de um Colaborador. */
export function buscaColaborador(c: {
  nome: string;
  cpf: string;
  cargo: string;
  cbo?: string | null;
  cns?: string | null;
}): string {
  return normalizarTexto([c.nome, c.cpf, c.cargo, c.cbo, c.cns].filter(Boolean).join(' '));
}

/** Concatena e normaliza os campos pesquisáveis de um Contrato. */
export function buscaContrato(c: {
  numero: string;
  credorNome: string;
  credorDocumento: string;
  naturezaContratacao: string;
  objeto: string;
}): string {
  return normalizarTexto(
    [c.numero, c.credorNome, c.credorDocumento, c.naturezaContratacao, c.objeto]
      .filter(Boolean)
      .join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de um Bem Cedido. */
export function buscaBemCedido(b: {
  descricao: string;
  tipo: string;
  identificador: string;
  observacao?: string | null;
}): string {
  return normalizarTexto(
    [b.descricao, b.tipo, b.identificador, b.observacao].filter(Boolean).join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de um Servidor Cedido. */
export function buscaServidorCedido(s: {
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
}): string {
  return normalizarTexto(
    [s.nome, s.cpf, s.cargoPublico, s.funcaoEntidade, s.onusPagamento].filter(Boolean).join(' '),
  );
}

/** Concatena e normaliza os campos pesquisáveis de um Grupo de Usuários. */
export function buscaGrupo(g: { nome: string; descricao?: string | null }): string {
  return normalizarTexto([g.nome, g.descricao].filter(Boolean).join(' '));
}

/** Concatena e normaliza os campos pesquisáveis de um Órgão (Cliente). */
export function buscaCliente(c: {
  nome: string;
  cnpj: string;
  codigoMunicipio: number;
  codigoEntidade: number;
}): string {
  return normalizarTexto(
    [c.nome, c.cnpj, String(c.codigoMunicipio), String(c.codigoEntidade)].filter(Boolean).join(' '),
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

/** Texto de busca de um rateio: título e, quando há, o critério descrito. */
export function buscaRateio(r: { titulo: string; descricaoMetodo?: string | null }): string {
  return normalizarTexto([r.titulo, r.descricaoMetodo].filter(Boolean).join(' '));
}

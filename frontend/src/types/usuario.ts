export type TipoDocumento = 'CPF' | 'CNPJ';

export interface Usuario {
  id: string;
  clienteId: string | null;
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarUsuarioPayload {
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senha: string;
  confirmarSenha: string;
}

export type AtualizarUsuarioPayload = Omit<CriarUsuarioPayload, 'senha' | 'confirmarSenha'> & {
  senha?: string;
  confirmarSenha?: string;
};

export interface FiltrosUsuario {
  nome?: string;
  documento?: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  email?: string;
  celular?: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

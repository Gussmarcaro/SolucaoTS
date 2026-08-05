export type TipoDocumento = 'CPF' | 'CNPJ';

export interface Fornecedor {
  id: string;
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  inscricaoEstadual: string | null;
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo: string | null;
  whatsapp: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface FornecedorPayload {
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  inscricaoEstadual?: string | null;
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
}

export interface FiltrosFornecedor {
  nome?: string;
  documento?: string;
  cidade?: string;
  uf?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

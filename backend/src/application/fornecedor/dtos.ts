import type { TipoDocumento } from '@/core/fornecedor/Fornecedor';

export interface CriarFornecedorDTO {
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

export type AtualizarFornecedorDTO = CriarFornecedorDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosFornecedor {
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
}

export interface FiltrosFornecedor {
  nome?: string;
  documento?: string;
  cidade?: string;
  uf?: string;
  ativo?: boolean;
}

export interface ListarFornecedoresParams {
  filtros: FiltrosFornecedor;
  busca?: string;
  ordem?: { campo: string; direcao: 'asc' | 'desc' };
  page: number;
  pageSize: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

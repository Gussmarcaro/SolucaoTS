export interface CriarEmpresaDTO {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
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

export type AtualizarEmpresaDTO = CriarEmpresaDTO;

/** Filtros da listagem. */
export interface FiltrosEmpresa {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  ativo?: boolean; // status: Ativo/Inativo
}

export interface ListarEmpresasParams {
  filtros: FiltrosEmpresa;
  /** Busca global — casa com qualquer campo textual da grade (OR). */
  busca?: string;
  /** Ordenação (campo já validado contra whitelist). */
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

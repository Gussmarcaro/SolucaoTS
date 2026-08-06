export interface CriarColaboradorDTO {
  nome: string;
  cpf: string;
  cargo: string;
  cbo?: string | null;
  cns?: string | null;
  dataAdmissao: string;
  dataDemissao?: string | null;
  salarioContratual: number | string;
}

export type AtualizarColaboradorDTO = CriarColaboradorDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosColaborador {
  nome: string;
  cpf: string;
  cargo: string;
  cbo: string | null;
  cns: string | null;
  dataAdmissao: Date;
  dataDemissao: Date | null;
  salarioContratual: number;
}

export interface FiltrosColaborador {
  nome?: string;
  cpf?: string;
  cargo?: string;
  ativo?: boolean;
}

export interface ListarColaboradoresParams {
  filtros: FiltrosColaborador;
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

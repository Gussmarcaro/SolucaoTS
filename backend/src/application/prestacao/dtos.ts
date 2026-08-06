export interface CriarPrestacaoDTO {
  ajusteId: string;
  ano: number | string;
  ehRetificacao?: boolean;
}

export interface FiltrosPrestacao {
  status?: string;
  ano?: number;
  ajusteId?: string;
}

export interface ListarPrestacoesParams {
  filtros: FiltrosPrestacao;
  busca?: string;
  ordem?: { campo: string; direcao: 'asc' | 'desc' };
  page: number;
  pageSize: number;
}

export interface DadosCriarPrestacao {
  ajusteId: string;
  tipoDocumento: string;
  ano: number;
  mes: number;
  ehRetificacao: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

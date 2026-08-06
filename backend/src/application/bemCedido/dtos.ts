export interface CriarBemCedidoDTO {
  descricao: string;
  tipo: string;
  identificador: string;
  valor: number | string;
  dataCessao: string;
  dataDevolucao?: string | null;
  observacao?: string | null;
}

export type AtualizarBemCedidoDTO = CriarBemCedidoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosBemCedido {
  descricao: string;
  tipo: string;
  identificador: string;
  valor: number;
  dataCessao: Date;
  dataDevolucao: Date | null;
  observacao: string | null;
}

export interface FiltrosBemCedido {
  descricao?: string;
  tipo?: string;
  identificador?: string;
  ativo?: boolean;
}

export interface ListarBensCedidosParams {
  filtros: FiltrosBemCedido;
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

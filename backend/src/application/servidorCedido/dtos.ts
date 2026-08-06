export interface CriarServidorCedidoDTO {
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
  cargaHoraria?: number | string | null;
  remuneracaoBruta: number | string;
  dataInicialCessao: string;
  dataFinalCessao?: string | null;
}

export type AtualizarServidorCedidoDTO = CriarServidorCedidoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosServidorCedido {
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
  cargaHoraria: number | null;
  remuneracaoBruta: number;
  dataInicialCessao: Date;
  dataFinalCessao: Date | null;
}

export interface FiltrosServidorCedido {
  nome?: string;
  cpf?: string;
  cargoPublico?: string;
  onusPagamento?: string;
  ativo?: boolean;
}

export interface ListarServidoresCedidosParams {
  filtros: FiltrosServidorCedido;
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

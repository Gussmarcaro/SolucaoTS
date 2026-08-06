export interface ServidorCedido {
  id: string;
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
  cargaHoraria: number | null;
  remuneracaoBruta: number;
  dataInicialCessao: string; // 'YYYY-MM-DD'
  dataFinalCessao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ServidorCedidoPayload {
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
  cargaHoraria?: number | null;
  remuneracaoBruta: number;
  dataInicialCessao: string;
  dataFinalCessao?: string | null;
}

export interface FiltrosServidorCedido {
  nome?: string;
  cpf?: string;
  cargoPublico?: string;
  onusPagamento?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

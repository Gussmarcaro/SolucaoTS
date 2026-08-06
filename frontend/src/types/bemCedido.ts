export interface BemCedido {
  id: string;
  descricao: string;
  tipo: string;
  identificador: string;
  valor: number;
  dataCessao: string; // 'YYYY-MM-DD'
  dataDevolucao: string | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface BemCedidoPayload {
  descricao: string;
  tipo: string;
  identificador: string;
  valor: number;
  dataCessao: string;
  dataDevolucao?: string | null;
  observacao?: string | null;
}

export interface FiltrosBemCedido {
  descricao?: string;
  tipo?: string;
  identificador?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  cbo: string | null;
  cns: string | null;
  dataAdmissao: string; // 'YYYY-MM-DD'
  dataDemissao: string | null;
  salarioContratual: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ColaboradorPayload {
  nome: string;
  cpf: string;
  cargo: string;
  cbo?: string | null;
  cns?: string | null;
  dataAdmissao: string;
  dataDemissao?: string | null;
  salarioContratual: number;
}

export interface FiltrosColaborador {
  nome?: string;
  cpf?: string;
  cargo?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

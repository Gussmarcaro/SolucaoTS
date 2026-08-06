export interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  totalMembros: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface GrupoResumo {
  id: string;
  nome: string;
}

export interface GrupoPayload {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface FiltrosGrupo {
  nome?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

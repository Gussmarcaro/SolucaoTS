export interface CriarGrupoDTO {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
}

export type AtualizarGrupoDTO = CriarGrupoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosGrupo {
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface FiltrosGrupo {
  nome?: string;
  ativo?: boolean;
}

export interface ListarGruposParams {
  filtros: FiltrosGrupo;
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

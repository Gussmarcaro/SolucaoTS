import type { Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';

export interface CriarAjusteDTO {
  clienteId?: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida?: string | null;
  codigoAjuste: string;
  numero?: string | null;
  objeto: string;
  valorGlobal: number | string;
  dataAssinatura: string;
  vigenciaInicial?: string | null;
  vigenciaFinal?: string | null;
  periodicidade: Periodicidade;
  status?: StatusAjuste;
}

export type AtualizarAjusteDTO = CriarAjusteDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosAjuste {
  clienteId: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida: string | null;
  codigoAjuste: string;
  numero: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: Date;
  vigenciaInicial: Date | null;
  vigenciaFinal: Date | null;
  periodicidade: Periodicidade;
  status: StatusAjuste;
}

export interface FiltrosAjuste {
  codigoAjuste?: string;
  tipoAjuste?: string;
  status?: string;
  entidadeBeneficiariaId?: string;
}

export interface ListarAjustesParams {
  filtros: FiltrosAjuste;
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

import type { TipoDocumento } from '@/core/contrato/Contrato';

export interface CriarContratoDTO {
  numero: string;
  credorNome: string;
  credorDocumento: string;
  credorDocumentoTipo: TipoDocumento;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  valorMontante: number | string;
}

export type AtualizarContratoDTO = CriarContratoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosContrato {
  numero: string;
  credorNome: string;
  credorDocumento: string;
  credorDocumentoTipo: TipoDocumento;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: Date;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  valorMontante: number;
}

export interface FiltrosContrato {
  numero?: string;
  credorNome?: string;
  credorDocumento?: string;
  naturezaContratacao?: string;
  ativo?: boolean;
}

export interface ListarContratosParams {
  filtros: FiltrosContrato;
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

import type { PeriodicidadeMeta, QualificadorMeta, TipoMeta } from '@/core/meta/Meta';

export interface ProgramaDTO {
  nome: string;
}

export interface MetaPeriodoDTO {
  ano: number | string;
  periodo: number | string;
  qualificador?: QualificadorMeta | null;
  quantidade: number | string;
}

export interface MetaDTO {
  codigoMeta: string;
  nome?: string | null;
  descricao?: string | null;
  tipo?: TipoMeta | null;
  unidadeMedida?: string | null;
  periodicidade?: PeriodicidadeMeta | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  periodicidades?: MetaPeriodoDTO[] | null;
}

/** Uma linha do quadro de períodos, já normalizada. */
export interface DadosMetaPeriodo {
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: number;
}

/** Dados normalizados/validados de uma meta, prontos para persistência. */
export interface DadosMeta {
  codigoMeta: string;
  nome: string;
  descricao: string | null;
  tipo: TipoMeta;
  unidadeMedida: string | null;
  periodicidade: PeriodicidadeMeta;
  vigenciaInicio: Date | null;
  vigenciaFim: Date | null;
  periodicidades: DadosMetaPeriodo[];
}

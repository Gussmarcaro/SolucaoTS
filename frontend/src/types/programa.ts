import type { PeriodicidadeMeta, QualificadorMeta, TipoMeta } from './meta';

/** Quanto se pretende realizar em um período da meta. */
export interface MetaPeriodo {
  id: string;
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: number;
}

export interface Meta {
  id: string;
  programaId: string;
  codigoMeta: string;
  /** O enunciado curto — é ele que aparece nas listas e na aferição. */
  nome: string;
  descricao: string | null;
  tipo: TipoMeta;
  /** Derivado de `tipo` pelo servidor; nunca é gravado. */
  quantificavel: boolean;
  /** A unidade do número previsto: consultas, atendimentos, horas... */
  unidadeMedida: string | null;
  periodicidade: PeriodicidadeMeta;
  /** 'YYYY-MM-DD' — a vigência **da meta**, que decide seus períodos. */
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  periodicidades: MetaPeriodo[];
}

export interface Programa {
  id: string;
  ajusteId: string;
  nome: string;
  metas: Meta[];
}

export interface ProgramaPayload {
  nome: string;
}

export interface MetaPeriodoPayload {
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  /** Aceita texto: a tela envia "5000,5" e o servidor lê o padrão brasileiro. */
  quantidade: number | string;
}

export interface MetaPayload {
  codigoMeta: string;
  nome: string;
  descricao?: string | null;
  tipo: TipoMeta;
  unidadeMedida?: string | null;
  periodicidade: PeriodicidadeMeta;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  periodicidades: MetaPeriodoPayload[];
}

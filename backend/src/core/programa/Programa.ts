import type { PeriodicidadeMeta, QualificadorMeta, TipoMeta } from '@/core/meta/Meta';

export type { PeriodicidadeMeta, QualificadorMeta, TipoMeta };

/** Quanto se pretende realizar em um período da meta. */
export interface MetaPeriodo {
  id: string;
  ano: number;
  /** 1..12 conforme a periodicidade. Gerado por `gerarPeriodos`. */
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: number;
}

/** Meta de um Programa (plano de metas do ajuste). */
export interface Meta {
  id: string;
  programaId: string;
  codigoMeta: string;
  /** O enunciado curto — é ele que aparece nas listas e na aferição. */
  nome: string;
  descricao: string | null;
  tipo: TipoMeta;
  /**
   * Derivado de `tipo`, **não** gravado — ver `ehQuantificavel`.
   *
   * Continua no domínio porque é a pergunta que as telas fazem, e derivá-lo
   * aqui poupa cada uma de repetir a comparação com o tipo.
   */
  quantificavel: boolean;
  /** A unidade do número previsto: consultas, atendimentos, horas... */
  unidadeMedida: string | null;
  periodicidade: PeriodicidadeMeta;
  /** 'YYYY-MM-DD' — a vigência **da meta**, que decide seus períodos. */
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  /** O previsto, período a período. Vazia na qualitativa não quantificável. */
  periodicidades: MetaPeriodo[];
}

/** Programa do plano de metas, com suas metas. */
export interface Programa {
  id: string;
  ajusteId: string;
  nome: string;
  metas: Meta[];
}

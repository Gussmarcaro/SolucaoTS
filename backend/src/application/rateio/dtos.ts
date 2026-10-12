import type { MetodoRateio } from '@/core/rateio/Rateio';

/**
 * Uma linha do quadro: **ou** um ajuste, **ou** uma origem própria da entidade.
 *
 * A origem própria (atendimento particular, plano de saúde, SUS) não é um
 * ajuste e não tem id — identifica-se pelo nome. Ela entra no quadro porque
 * consome a mesma despesa administrativa: sem ela, o denominador fica só com
 * os convênios e eles pagam a fatia da entidade.
 */
export interface ParticipanteDTO {
  ajusteId?: string | null;
  origem?: string | null;
  base?: number | string | null;
}

export interface RateioDTO {
  titulo: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  metodo: string;
  descricaoMetodo?: string | null;
  observacoes?: string | null;
  participantes?: ParticipanteDTO[];
}

/** Dados normalizados/validados prontos para persistência. */
export interface DadosRateio {
  titulo: string;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  metodo: MetodoRateio;
  descricaoMetodo: string | null;
  observacoes: string | null;
  participantes: { ajusteId: string | null; origem: string | null; base: number }[];
}

export interface FiltrosRateio {
  metodo?: MetodoRateio;
  ativo?: boolean;
  /** Rateios vigentes nesta data. */
  vigenteEm?: Date;
  busca?: string;
}

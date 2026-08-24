import type { MetodoRateio } from '@/core/rateio/Rateio';

export interface ParticipanteDTO {
  ajusteId: string;
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
  participantes: { ajusteId: string; base: number }[];
}

export interface FiltrosRateio {
  metodo?: MetodoRateio;
  ativo?: boolean;
  /** Rateios vigentes nesta data. */
  vigenteEm?: Date;
  busca?: string;
}

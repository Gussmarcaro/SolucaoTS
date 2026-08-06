export interface TermoAditivoDTO {
  numero: string;
  dataAssinatura: string;
  valorAcrescido?: number | string | null;
  valorSuprimido?: number | string | null;
}

/** Dados normalizados/validados prontos para persistência. */
export interface DadosTermoAditivo {
  numero: string;
  dataAssinatura: Date;
  valorAcrescido: number | null;
  valorSuprimido: number | null;
}

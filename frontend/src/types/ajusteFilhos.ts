export interface TermoAditivo {
  id: string;
  ajusteId: string;
  numero: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  valorAcrescido: number | null;
  valorSuprimido: number | null;
  /** Nova data final da vigência, quando o aditivo prorroga. */
  novaVigenciaFinal: string | null;
  /** O que o aditivo alterou — o TCESP pede a descrição. */
  objeto: string | null;
}

export interface TermoAditivoPayload {
  numero: string;
  dataAssinatura: string;
  valorAcrescido?: number | null;
  valorSuprimido?: number | null;
  novaVigenciaFinal?: string | null;
  objeto?: string | null;
}

export interface Empenho {
  id: string;
  ajusteId: string;
  numeroEmpenho: string;
  anoEmpenho: number;
  retificacao: boolean;
  dataEmissaoEmpenho: string; // 'YYYY-MM-DD'
}

export interface EmpenhoPayload {
  numeroEmpenho: string;
  anoEmpenho: number;
  retificacao?: boolean;
  dataEmissaoEmpenho: string;
}

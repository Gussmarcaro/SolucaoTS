export interface TermoAditivo {
  id: string;
  ajusteId: string;
  numero: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  valorAcrescido: number | null;
  valorSuprimido: number | null;
}

export interface TermoAditivoPayload {
  numero: string;
  dataAssinatura: string;
  valorAcrescido?: number | null;
  valorSuprimido?: number | null;
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

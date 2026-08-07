import type { TipoDocumento, TipoVigencia } from '@prisma/client';

export interface ContratoDTO {
  numero: string;
  credorTipoDoc: string;
  credorNumeroDoc: string;
  credorNome?: string | null;
  dataAssinatura: string;
  vigenciaTipo: string;
  vigenciaDataInicial: string;
  vigenciaDataFinal?: string | null;
  objeto: string;
  naturezaContratacao?: Array<number | string>;
  naturezaOutro?: string | null;
  criterioSelecao?: number | string | null;
  criterioSelecaoOutro?: string | null;
  artigoRegulamentoCompras?: string | null;
  valorMontante: number | string;
  valorTipo?: number | string | null;
}

/** Dados normalizados/validados prontos para persistência. */
export interface DadosContrato {
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome: string | null;
  dataAssinatura: Date;
  vigenciaTipo: TipoVigencia;
  vigenciaDataInicial: Date;
  vigenciaDataFinal: Date | null;
  objeto: string;
  naturezaContratacao: number[];
  naturezaOutro: string | null;
  criterioSelecao: number | null;
  criterioSelecaoOutro: string | null;
  artigoRegulamentoCompras: string | null;
  valorMontante: number;
  valorTipo: number | null;
}

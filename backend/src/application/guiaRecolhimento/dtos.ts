import type { TipoRetencao } from '@/core/documentoFiscal/DocumentoFiscal';

export interface GuiaDTO {
  tipo?: string;
  ano?: number | string;
  mes?: number | string;
  valor?: number | string;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  numeroDocumento?: string | null;
  observacao?: string | null;
}

/** Guia normalizada e validada, pronta para persistência. */
export interface DadosGuia {
  tipo: TipoRetencao;
  ano: number;
  mes: number;
  valor: number;
  dataVencimento: Date | null;
  dataPagamento: Date | null;
  numeroDocumento: string | null;
  observacao: string | null;
}

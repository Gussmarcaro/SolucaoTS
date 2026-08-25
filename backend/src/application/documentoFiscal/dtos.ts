import type {
  TipoDocumento,
  TipoDocumentoFiscal,
  TipoRetencao,
} from '@/core/documentoFiscal/DocumentoFiscal';

export interface DocumentoFiscalDTO {
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome?: string | null;
  contratoNumero?: string | null;
  contratoId?: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor?: number | string | null;
  valorBruto: number | string;
  valorEncargos?: number | string | null;
  retencaoTipo?: string | null;
  tipoDocumento?: string | null;
  categoriaDespesaTipo: number | string;
  propostaCategoria?: string | null;
  propostaSubcategoria?: string | null;
  rateioProveniente?: boolean;
  rateioId?: string | null;
  rateioPercentual?: number | string | null;
}

/** Dados normalizados/validados prontos para persistência. */
export interface DadosDocumentoFiscal {
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome: string | null;
  contratoNumero: string | null;
  contratoId: string | null;
  descricao: string;
  dataEmissao: Date;
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number;
  retencaoTipo: TipoRetencao | null;
  tipoDocumento: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  rateioProveniente: boolean;
  rateioId: string | null;
  rateioPercentual: number | null;
}

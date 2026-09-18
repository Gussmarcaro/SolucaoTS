import type { DocumentoFiscal } from '@/core/documentoFiscal/DocumentoFiscal';
import type {
  RetencaoDocumento,
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
  contratoFirmadoId?: string | null;
  contratoId?: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor?: number | string | null;
  valorBruto: number | string;
  valorEncargos?: number | string | null;
  retencaoTipo?: string | null;
  /** Detalhamento por tributo; quando vem, define o valorEncargos. */
  retencoes?: Array<{ tipo?: string | null; valor?: number | string | null }> | null;
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
  contratoFirmadoId: string | null;
  contratoId: string | null;
  descricao: string;
  dataEmissao: Date;
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number;
  retencaoTipo: TipoRetencao | null;
  retencoes: RetencaoDocumento[];
  tipoDocumento: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  rateioProveniente: boolean;
  rateioId: string | null;
  rateioPercentual: number | null;
}

/**
 * Uma nota vista **de dentro de uma prestação**.
 *
 * É a nota do órgão mais o que a ligação acrescenta: o percentual apropriado e
 * o contrato daquela prestação. O `valorApropriado` é derivado, e vem calculado
 * para a tela não repetir a conta — e não repetir significa não divergir.
 */
export interface DocumentoFiscalApropriado extends DocumentoFiscal {
  percentual: number;
  contratoIdPrestacao: string | null;
  valorApropriado: number;
}

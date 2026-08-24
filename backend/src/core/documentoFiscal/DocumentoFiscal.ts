export type TipoDocumento = 'CPF' | 'CNPJ' | 'RNE';

/**
 * Espécie do documento fiscal — **controle interno, não transmitida**.
 *
 * O bloco `documentos_fiscais` do schema v1.14 não tem campo de espécie e usa
 * `additionalProperties: false`: não há onde declará-la no envio. A lista é do
 * órgão, para organizar o arquivo e a conferência.
 */
export type TipoDocumentoFiscal =
  | 'NOTA_FISCAL'
  | 'NOTA_FISCAL_ELETRONICA'
  | 'NOTA_PRESTACAO_SERVICOS'
  | 'NOTA_PRESTACAO_SERVICOS_ELETRONICA'
  | 'RECIBO'
  | 'FATURA';

export const TIPOS_DOCUMENTO_FISCAL: TipoDocumentoFiscal[] = [
  'NOTA_FISCAL',
  'NOTA_FISCAL_ELETRONICA',
  'NOTA_PRESTACAO_SERVICOS',
  'NOTA_PRESTACAO_SERVICOS_ELETRONICA',
  'RECIBO',
  'FATURA',
];

/** Entidade de domínio — Documento Fiscal (bloco da prestação). */
export interface DocumentoFiscal {
  id: string;
  prestacaoId: string;
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome: string | null;
  contratoNumero: string | null;
  descricao: string;
  dataEmissao: string; // 'YYYY-MM-DD'
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number; // >= 0 e < valorBruto
  /** Espécie do documento — controle interno; ver `TipoDocumentoFiscal`. */
  tipoDocumento: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  rateioProveniente: boolean;
  rateioPercentual: number | null;
}

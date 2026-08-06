export type TipoDocumento = 'CPF' | 'CNPJ' | 'RNE';

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
  categoriaDespesaTipo: number;
  rateioProveniente: boolean;
  rateioPercentual: number | null;
}

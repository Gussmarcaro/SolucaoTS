export type TipoDocumento = 'CPF' | 'CNPJ' | 'RNE';

export interface DocumentoFiscal {
  id: string;
  prestacaoId: string;
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome: string | null;
  contratoNumero: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number;
  categoriaDespesaTipo: number;
  rateioProveniente: boolean;
  rateioPercentual: number | null;
}

export interface DocumentoFiscalPayload {
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome?: string | null;
  contratoNumero?: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor?: number | null;
  valorBruto: number;
  valorEncargos?: number | null;
  categoriaDespesaTipo: number;
  rateioProveniente?: boolean;
  rateioPercentual?: number | null;
}

export type MeioPagamento = 'BANCO' | 'FUNDO_FIXO';

export interface Pagamento {
  id: string;
  prestacaoId: string;
  documentoFiscalId: string | null;
  documentoNumero: string | null;
  dataPagamento: string;
  valor: number;
  fonteRecursoTipo: number;
  meioPagamento: MeioPagamento;
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

export interface PagamentoPayload {
  documentoFiscalId?: string | null;
  dataPagamento: string;
  valor: number;
  fonteRecursoTipo: number;
  meioPagamento: MeioPagamento;
  banco?: number | null;
  agencia?: number | null;
  contaCorrente?: string | null;
  numeroTransacao?: string | null;
}

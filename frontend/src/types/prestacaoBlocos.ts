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

export const TIPO_DOCUMENTO_FISCAL_LABEL: Record<TipoDocumentoFiscal, string> = {
  NOTA_FISCAL: 'Nota Fiscal',
  NOTA_FISCAL_ELETRONICA: 'Nota Fiscal Eletrônica',
  NOTA_PRESTACAO_SERVICOS: 'Nota Prestação de Serviços',
  NOTA_PRESTACAO_SERVICOS_ELETRONICA: 'Nota Prestação de Serviços Eletrônica',
  RECIBO: 'Recibos',
  FATURA: 'Fatura',
};

/**
 * Retenção do documento fiscal — **controle interno, não transmitida**.
 *
 * O TCESP recebe só o valor (`valor_encargos`, obrigatório e numérico); qual
 * tributo foi retido não tem campo no schema.
 */
export type TipoRetencao = 'IRRF' | 'ISSQN' | 'PIS' | 'COFINS' | 'IR' | 'CSSL';

export const TIPO_RETENCAO_LABEL: Record<TipoRetencao, string> = {
  IRRF: 'IRRF',
  ISSQN: 'ISSQN',
  PIS: 'PIS',
  COFINS: 'COFINS',
  IR: 'IR',
  CSSL: 'CSSL',
};

export interface DocumentoFiscal {
  id: string;
  prestacaoId: string;
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome: string | null;
  contratoNumero: string | null;
  /** Contrato da prestação a que a nota se refere — herda as categorias. */
  contratoId: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number;
  /** Qual retenção o valor acima representa — controle interno. */
  retencaoTipo: TipoRetencao | null;
  /** Controle interno — ver `TipoDocumentoFiscal`. */
  tipoDocumento: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  /**
   * Rubrica do Plano de Aplicação do ajuste — **controle interno**.
   * Texto, não vínculo: reimportar o plano recria os itens.
   */
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  /**
   * Digitalização da nota, quando anexada. O conteúdo não vem no JSON — só o
   * que a tela precisa para oferecer o download.
   */
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  arquivoEnviadoEm: string | null;
  rateioProveniente: boolean;
  rateioPercentual: number | null;
}

export interface DocumentoFiscalPayload {
  numero: string;
  credorTipoDoc: TipoDocumento;
  credorNumeroDoc: string;
  credorNome?: string | null;
  contratoNumero?: string | null;
  contratoId?: string | null;
  descricao: string;
  dataEmissao: string;
  estadoEmissor?: number | null;
  valorBruto: number;
  valorEncargos?: number | null;
  retencaoTipo?: TipoRetencao | null;
  tipoDocumento?: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  propostaCategoria?: string | null;
  propostaSubcategoria?: string | null;
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

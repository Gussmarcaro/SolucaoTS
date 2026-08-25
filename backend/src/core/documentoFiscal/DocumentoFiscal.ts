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

/**
 * Retenção do documento fiscal — **controle interno, não transmitida**.
 *
 * O TCESP recebe só o valor (`valor_encargos`, obrigatório e numérico); qual
 * tributo foi retido não tem campo no schema.
 */
export type TipoRetencao = 'IRRF' | 'ISSQN' | 'PIS' | 'COFINS' | 'IR' | 'CSSL';

export const TIPOS_RETENCAO: TipoRetencao[] = ['IRRF', 'ISSQN', 'PIS', 'COFINS', 'IR', 'CSSL'];

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
  /** Contrato da prestação a que a nota se refere — herda as categorias. */
  contratoId: string | null;
  descricao: string;
  dataEmissao: string; // 'YYYY-MM-DD'
  estadoEmissor: number | null;
  valorBruto: number;
  valorEncargos: number; // >= 0 e < valorBruto — é o valor_encargos do envio
  /** Qual retenção o valor acima representa — controle interno. */
  retencaoTipo: TipoRetencao | null;
  /** Espécie do documento — controle interno; ver `TipoDocumentoFiscal`. */
  tipoDocumento: TipoDocumentoFiscal | null;
  categoriaDespesaTipo: number;
  /**
   * Rubrica do Plano de Aplicação do ajuste — **controle interno**.
   * Texto, não vínculo: reimportar o plano recria os itens (ver o schema).
   */
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  /**
   * Digitalização da nota, quando anexada. O **conteúdo** não vem aqui: só o
   * que a tela precisa para oferecer o download.
   */
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  arquivoEnviadoEm: string | null;
  rateioProveniente: boolean;
  rateioPercentual: number | null;
}

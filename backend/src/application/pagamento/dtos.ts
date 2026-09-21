import type { MeioPagamento } from '@/core/pagamento/Pagamento';

export interface PagamentoDTO {
  ajusteId?: string | null;
  documentoFiscalId?: string | null;
  dataPagamento: string;
  valor: number | string;
  fonteRecursoTipo: number | string;
  meioPagamento: MeioPagamento;
  banco?: number | string | null;
  agencia?: number | string | null;
  contaCorrente?: string | null;
  numeroTransacao?: string | null;
}

/**
 * O pagamento rateado: os mesmos dados de um pagamento, **sem o valor**.
 *
 * O valor não vem do cliente — sai do quadro do rateio aplicado ao líquido
 * da nota. Aceitá-lo aqui permitiria lançar 500 num ajuste que o rateio diz
 * ser 600, e nada acusaria.
 */
export type RatearPagamentoDTO = Omit<PagamentoDTO, 'valor' | 'ajusteId'> & {
  documentoFiscalId: string;
  valor?: never;
};

/** Dados normalizados/validados prontos para persistência. */
export interface DadosPagamento {
  /** Parceria do lançamento; nula até alguém dizer qual. */
  ajusteId?: string | null;
  documentoFiscalId: string | null;
  dataPagamento: Date;
  valor: number;
  fonteRecursoTipo: number;
  meioPagamento: MeioPagamento;
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

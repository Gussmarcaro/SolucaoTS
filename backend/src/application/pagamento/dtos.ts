import type { MeioPagamento } from '@/core/pagamento/Pagamento';

export interface PagamentoDTO {
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

/** Dados normalizados/validados prontos para persistência. */
export interface DadosPagamento {
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

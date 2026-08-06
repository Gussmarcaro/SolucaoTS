export type MeioPagamento = 'BANCO' | 'FUNDO_FIXO';

/** Entidade de domínio — Pagamento (bloco da prestação). */
export interface Pagamento {
  id: string;
  prestacaoId: string;
  documentoFiscalId: string | null; // null = Folha Ordinária (nº 9999 no JSON)
  documentoNumero: string | null; // número do doc fiscal vinculado (join p/ exibição)
  dataPagamento: string; // 'YYYY-MM-DD'
  valor: number;
  fonteRecursoTipo: number;
  meioPagamento: MeioPagamento;
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

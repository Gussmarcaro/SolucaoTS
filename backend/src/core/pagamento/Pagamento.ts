export type MeioPagamento = 'BANCO' | 'FUNDO_FIXO';

/** Entidade de domínio — Pagamento (bloco da prestação). */
export interface Pagamento {
  id: string;
  /** Órgão dono do lançamento. Nulo só nos gravados antes desta mudança. */
  clienteId: string | null;
  /** Parceria a que o lançamento pertence — antes só se alcançava pela prestação. */
  ajusteId: string | null;
  /**
   * Prestação que se apropriou deste lançamento, ou `null` enquanto nenhuma o
   * fez. A escolha é explícita, feita na aba da prestação.
   */
  prestacaoId: string | null;
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

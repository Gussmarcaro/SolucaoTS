/** Entidade de domínio — Repasse (bloco da prestação, vinculado a um Empenho). */
export interface Repasse {
  id: string;
  prestacaoId: string;
  empenhoId: string | null;
  empenhoNumero: string | null; // join p/ exibição
  dataPrevista: string; // 'YYYY-MM-DD'
  dataRepasse: string; // 'YYYY-MM-DD'
  valorPrevisto: number;
  valorRepasse: number;
  justificativaDiferenca: string | null;
  tipoDocumentoBancario: number | null;
  descricaoOutros: string | null;
  numeroDocumento: string | null;
  banco: number | null;
  agencia: number | null;
  conta: string | null;
}

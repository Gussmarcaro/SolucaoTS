/** Entidade de domínio — Devolução (glosas/saldos devolvidos ou não aplicados). */
export interface Devolucao {
  id: string;
  prestacaoId: string;
  data: string; // 'YYYY-MM-DD'
  naturezaDevolucaoTipo: number;
  valor: number;
}

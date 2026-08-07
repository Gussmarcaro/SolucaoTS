/** Entidade de domínio — Empenho (bloco da prestação de contas). */
export interface EmpenhoPrestacao {
  id: string;
  prestacaoId: string;
  numero: string;
  dataEmissao: string; // 'YYYY-MM-DD'
  classificacaoEconomica: string;
  fonteRecursoTipo: number;
  valor: number;
  historico: string | null;
  cpfOrdenadorDespesa: string;
}

/** Entidade de domínio — Bem Cedido vinculado ao Ajuste (importado por CSV). */
export interface BemAjuste {
  id: string;
  ajusteId: string;
  identificador: string; // "ID" do CSV
  data: string; // 'YYYY-MM-DD'
  valor: number;
  codigo: string;
}

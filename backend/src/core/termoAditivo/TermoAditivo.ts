/** Entidade de domínio — Termo Aditivo (filho de Ajuste). */
export interface TermoAditivo {
  id: string;
  ajusteId: string;
  numero: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  valorAcrescido: number | null;
  valorSuprimido: number | null;
}

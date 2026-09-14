/** Entidade de domínio — Termo Aditivo (filho de Ajuste). */
export interface TermoAditivo {
  id: string;
  ajusteId: string;
  numero: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  valorAcrescido: number | null;
  valorSuprimido: number | null;
  /** Nova data final da vigência, quando o aditivo prorroga. */
  novaVigenciaFinal: string | null;
  /** O que o aditivo alterou — o TCESP pede a descrição. */
  objeto: string | null;
}

/** Entidade de domínio — item do Cronograma de Desembolso (importado por CSV). */
export interface CronogramaItem {
  id: string;
  ajusteId: string;
  /** Rubrica do plano; nula nas linhas agregadas vindas do CSV. */
  categoria: string | null;
  subcategoria: string | null;
  ano: number;
  mes: number; // 1-12
  valor: number;
}

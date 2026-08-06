/** Entidade de domínio — item do Cronograma de Desembolso (importado por CSV). */
export interface CronogramaItem {
  id: string;
  ajusteId: string;
  ano: number;
  mes: number; // 1-12
  valor: number;
}

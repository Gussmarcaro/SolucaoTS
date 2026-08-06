import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';

/** Item normalizado do cronograma, pronto para persistência (sem id/ajusteId). */
export interface DadosCronogramaItem {
  ano: number;
  mes: number;
  valor: number;
}

export interface ResultadoImportacaoCronograma {
  itens: CronogramaItem[];
  totalLinhas: number;
  importados: number;
  ignoradas: number;
  erros: string[];
}

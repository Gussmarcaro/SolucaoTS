import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';

/** Item normalizado do cronograma, pronto para persistência (sem id/ajusteId). */
export interface DadosCronogramaItem {
  categoria?: string | null;
  subcategoria?: string | null;
  ano: number;
  mes: number;
  valor: number;
}

/**
 * Cronograma digitado na tela: uma linha por rubrica **e** mês.
 *
 * Diferente do plano, aqui não há regra de ×12 — o ponto do cronograma é
 * justamente que os meses diferem entre si.
 */
export interface CronogramaDigitadoDTO {
  itens?: {
    categoria?: string;
    subcategoria?: string;
    ano?: number | string;
    mes?: number | string;
    valor?: number | string | null;
  }[];
}

export interface ResultadoImportacaoCronograma {
  itens: CronogramaItem[];
  totalLinhas: number;
  importados: number;
  ignoradas: number;
  erros: string[];
}

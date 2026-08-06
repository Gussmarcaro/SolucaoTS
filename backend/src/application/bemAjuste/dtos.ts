import type { BemAjuste } from '@/core/bemAjuste/BemAjuste';

/** Item normalizado do bem, pronto para persistência (sem id/ajusteId). */
export interface DadosBemAjuste {
  identificador: string;
  data: Date;
  valor: number;
  codigo: string;
}

export interface ResultadoImportacaoBens {
  itens: BemAjuste[];
  totalLinhas: number;
  importados: number;
  ignoradas: number;
  erros: string[];
}

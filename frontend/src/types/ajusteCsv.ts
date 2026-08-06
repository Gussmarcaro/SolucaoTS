export interface PlanoItem {
  id: string;
  ajusteId: string;
  categoria: string;
  subcategoria: string;
  ano: number;
  mes: number;
  valor: number;
  descricao: string | null;
}

export interface CronogramaItem {
  id: string;
  ajusteId: string;
  ano: number;
  mes: number;
  valor: number;
}

export interface ResumoImportacao {
  totalLinhas: number;
  importados: number;
  ignoradas: number;
  erros: string[];
}

export interface ResultadoImportacaoPlano extends ResumoImportacao {
  itens: PlanoItem[];
}

export interface ResultadoImportacaoCronograma extends ResumoImportacao {
  itens: CronogramaItem[];
}

export interface BemAjuste {
  id: string;
  ajusteId: string;
  identificador: string;
  data: string; // 'YYYY-MM-DD'
  valor: number;
  codigo: string;
}

export interface ResultadoImportacaoBens extends ResumoImportacao {
  itens: BemAjuste[];
}

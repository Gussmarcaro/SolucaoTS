export interface PlanoItem {
  id: string;
  ajusteId: string;
  categoria: string;
  subcategoria: string;
  /** Categoria de Despesa AUDESP — o elo com a execução. Null nos planos antigos. */
  categoriaDespesaTipo: number | null;
  ano: number;
  mes: number;
  valor: number;
  descricao: string | null;
}

export interface CronogramaItem {
  id: string;
  ajusteId: string;
  /** Rubrica do plano; nula nas linhas agregadas vindas do CSV. */
  categoria: string | null;
  subcategoria: string | null;
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

/** Uma linha do quadro Execução × Plano — ver o DTO do backend. */
export interface LinhaExecucaoPlano {
  categoriaDespesaTipo: number;
  /** Rubricas do plano que declaram esta categoria. Vazio no gasto fora do plano. */
  rubricas: string[];
  planejado: number;
  executado: number;
}

export interface ExecucaoPlano {
  ajusteId: string;
  ano: number;
  linhas: LinhaExecucaoPlano[];
  temGastoForaDoPlano: boolean;
}

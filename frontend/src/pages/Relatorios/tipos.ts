export interface LinhaExecucao {
  ajusteId: string;
  codigoAjuste: string;
  numero: string | null;
  tipoAjuste: string;
  entidadeNome: string;
  valorGlobal: number;
  repassado: number;
  pago: number;
  emPoderDaEntidade: number;
  aRepassar: number;
  /** Fração de 0 a 1; `null` quando o ajuste não tem valor global. */
  execucao: number | null;
  prestacoes: number;
}

export interface LinhaRepasse {
  ajusteId: string;
  codigoAjuste: string;
  entidadeNome: string;
  ano: number;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number;
  valorRepasse: number;
  atrasoDias: number;
  diferencaValor: number;
  justificativa: string | null;
}

export interface LinhaSituacao {
  ano: number;
  status: string;
  quantidade: number;
  valorGlobal: number;
}

export interface ResumoSituacao {
  linhas: LinhaSituacao[];
  ajustesSemPrestacao: {
    ajusteId: string;
    codigoAjuste: string;
    entidadeNome: string;
    dataAssinatura: string;
  }[];
}

/** Atraso a partir do qual a linha ganha destaque — espelha o backend. */
export const ATRASO_RELEVANTE_DIAS = 5;

export interface LinhaFornecedor {
  credorTipoDoc: string;
  credorNumeroDoc: string;
  credorNome: string | null;
  notas: number;
  valor: number;
  percentual: number;
  /** Soma das fatias até esta linha — é o que mede concentração. */
  acumulado: number;
}

export interface ResumoFornecedores {
  linhas: LinhaFornecedor[];
  total: number;
  credores: number;
  maiorFatia: number | null;
  credoresPara80: number | null;
}

/** Uma linha dos quadros de despesa do período. */
export interface DespesaDoPeriodo {
  id: string;
  dataEmissao: string;
  tipoDocumento: string | null;
  numero: string;
  descricao: string;
  credorNome: string | null;
  credorTipoDoc: string;
  credorNumeroDoc: string;
  categoriaDespesaTipo: number;
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  /** Na nota rateada dentro de um ajuste, já é a **parcela** dele. */
  valorContabil: number;
  pagoNoPeriodo: number;
  aPagar: number;
  pagamentos: { data: string; valor: number; codigoExtrato: string | null }[];
}

/** Os quatro números que o anexo oficial pede em colunas. */
export interface TotaisDespesas {
  contabilizado: number;
  /** (H) emitidas antes do período e pagas dentro dele. */
  anterioresPagasNoPeriodo: number;
  /** (I) emitidas e pagas dentro do período. */
  contabilizadoEPagoNoPeriodo: number;
  /** (J = H + I). */
  pagoNoPeriodo: number;
  aPagar: number;
}

export interface ResumoDoPeriodo {
  repasses: number;
  rendimentos: number;
  outrasReceitas: number;
  recursosProprios: number;
  totalRecursosPublicos: number;
  totalDisponivel: number;
}

export interface RelatorioDespesas {
  periodo: { de: string; ate: string };
  contabilizadas: DespesaDoPeriodo[];
  naoPagas: DespesaDoPeriodo[];
  pagas: DespesaDoPeriodo[];
  totais: TotaisDespesas;
  resumo: ResumoDoPeriodo;
}

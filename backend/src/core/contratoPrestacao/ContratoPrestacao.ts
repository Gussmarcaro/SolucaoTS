/** Entidade de domínio — Contrato celebrado pela beneficiária (bloco 7 da prestação). */
export interface ContratoPrestacao {
  id: string;
  prestacaoId: string;
  numero: string;
  credorTipoDoc: 'CPF' | 'CNPJ' | 'RNE';
  credorNumeroDoc: string;
  credorNome: string | null;
  dataAssinatura: string; // 'YYYY-MM-DD'
  vigenciaTipo: 'PRE_ESTABELECIDA' | 'INDETERMINADA';
  vigenciaDataInicial: string;
  vigenciaDataFinal: string | null;
  objeto: string;
  naturezaContratacao: number[];
  naturezaOutro: string | null; // obrigatório se 23 (Outros Serviços)
  criterioSelecao: number | null;
  criterioSelecaoOutro: string | null; // obrigatório se 4 (Outros)
  artigoRegulamentoCompras: string | null; // obrigatório p/ CG e TP
  valorMontante: number;
  /** Classificação da despesa contratada — herdada pelos documentos fiscais. */
  categoriaDespesaTipo: number | null;
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  valorTipo: number | null;
}

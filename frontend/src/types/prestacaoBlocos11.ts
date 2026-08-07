export type CredorTipoDoc = 'CPF' | 'CNPJ' | 'RNE';
export type VigenciaTipo = 'PRE_ESTABELECIDA' | 'INDETERMINADA';

export interface ContratoPrestacao {
  id: string;
  prestacaoId: string;
  numero: string;
  credorTipoDoc: CredorTipoDoc;
  credorNumeroDoc: string;
  credorNome: string | null;
  dataAssinatura: string;
  vigenciaTipo: VigenciaTipo;
  vigenciaDataInicial: string;
  vigenciaDataFinal: string | null;
  objeto: string;
  naturezaContratacao: number[];
  naturezaOutro: string | null;
  criterioSelecao: number | null;
  criterioSelecaoOutro: string | null;
  artigoRegulamentoCompras: string | null;
  valorMontante: number;
  valorTipo: number | null;
}

// Bloco 12 — Ajustes de Saldo
export interface RetificacaoRepasse {
  dataPrevista: string | null;
  dataRepasse: string | null;
  fonteRecursoTipo: number | null;
  valorRetificado: number | null;
}
export interface InclusaoRepasse {
  dataPrevista: string | null;
  dataRepasse: string | null;
  valor: number | null;
  fonteRecursoTipo: number | null;
}
export interface RetificacaoPagamento {
  docNumero: string | null;
  docCredorTipo: number | null;
  docCredorNumero: string | null;
  pagamentoData: string | null;
  pagamentoValor: number | null;
  fonteRecursoTipo: number | null;
  valorRetificado: number | null;
}
export interface InclusaoPagamento {
  docNumero: string | null;
  docCredorTipo: number | null;
  docCredorNumero: string | null;
  pagamentoData: string | null;
  pagamentoValor: number | null;
  fonteRecursoTipo: number | null;
  meioPagamento: number | null;
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}
export interface AjustesSaldo {
  retificacaoRepasses: RetificacaoRepasse[];
  inclusaoRepasses: InclusaoRepasse[];
  retificacaoPagamentos: RetificacaoPagamento[];
  inclusaoPagamentos: InclusaoPagamento[];
}

export interface ContratoPayload {
  numero: string;
  credorTipoDoc: CredorTipoDoc;
  credorNumeroDoc: string;
  credorNome?: string | null;
  dataAssinatura: string;
  vigenciaTipo: VigenciaTipo;
  vigenciaDataInicial: string;
  vigenciaDataFinal?: string | null;
  objeto: string;
  naturezaContratacao: number[];
  naturezaOutro?: string | null;
  criterioSelecao?: number | null;
  criterioSelecaoOutro?: string | null;
  artigoRegulamentoCompras?: string | null;
  valorMontante: number;
  valorTipo?: number | null;
}

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
  docCredorTipo: number | null; // 1=CPF, 2=CNPJ, 3=RNE
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
  meioPagamento: number | null; // 1=Banco, 2=Fundo Fixo
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

export interface AjustesSaldoDTO {
  retificacaoRepasses?: RetificacaoRepasse[];
  inclusaoRepasses?: InclusaoRepasse[];
  retificacaoPagamentos?: RetificacaoPagamento[];
  inclusaoPagamentos?: InclusaoPagamento[];
}

export interface AjustesSaldo {
  prestacaoId: string;
  retificacaoRepasses: RetificacaoRepasse[];
  inclusaoRepasses: InclusaoRepasse[];
  retificacaoPagamentos: RetificacaoPagamento[];
  inclusaoPagamentos: InclusaoPagamento[];
}

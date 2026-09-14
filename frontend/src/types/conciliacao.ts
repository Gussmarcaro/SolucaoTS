export type TipoLancamentoExtrato = 'CREDITO' | 'DEBITO';

/** Uma linha do extrato bancário, com a sugestão de par quando há uma só. */
export interface LinhaExtrato {
  id: string;
  banco: number | null;
  agencia: string | null;
  conta: string | null;
  fitId: string;
  data: string;
  valor: number;
  tipo: TipoLancamentoExtrato;
  descricao: string;
  pagamentoId: string | null;
  receitaId: string | null;
  conciliadoEm: string | null;
  ignorado: boolean;
  observacao: string | null;
  /** Calculada na consulta, nunca gravada — ver o caso de uso. */
  sugestao: {
    id: string;
    tipo: 'PAGAMENTO' | 'RECEITA';
    descricao: string;
    valor: number;
    data: string;
  } | null;
}

export interface ResultadoImportacaoOfx {
  banco: number | null;
  agencia: string | null;
  conta: string | null;
  periodo: { inicial: string | null; final: string | null };
  lidas: number;
  novas: number;
  repetidas: number;
  erros: string[];
}

export interface ConciliarPayload {
  pagamentoId?: string | null;
  receitaId?: string | null;
  ignorado?: boolean;
  observacao?: string | null;
}

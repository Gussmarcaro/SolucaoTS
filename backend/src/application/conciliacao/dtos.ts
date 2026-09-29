import type { TipoLancamentoExtrato } from '@/infrastructure/parsers/parseOfx';

/** Uma linha do extrato, como a tela a recebe. */
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
  /**
   * O lançamento que o sistema propõe, quando há um só compatível.
   *
   * Calculado na consulta, nunca gravado: os lançamentos mudam, e uma sugestão
   * guardada apontaria para um pagamento que já foi corrigido ou excluído.
   */
  sugestao: { id: string; tipo: 'PAGAMENTO' | 'RECEITA'; descricao: string; valor: number; data: string } | null;
}

export interface ResultadoImportacaoOfx {
  banco: number | null;
  agencia: string | null;
  conta: string | null;
  periodo: { inicial: string | null; final: string | null };
  lidas: number;
  novas: number;
  /** Já existiam pelo FITID — reimportação do mesmo período. */
  repetidas: number;
  erros: string[];
}

export interface ConciliarDTO {
  pagamentoId?: string | null;
  receitaId?: string | null;
  ignorado?: boolean;
  observacao?: string | null;
}

/**
 * Um lançamento do sistema que ainda não apareceu no extrato.
 *
 * É o **outro lado** da conciliação. A tela nasceu olhando só do banco para
 * dentro — "esta linha do extrato tem par?" —, e essa pergunta só existe depois
 * de importar o OFX: antes disso a aba ficava vazia dizendo "nenhum extrato
 * importado", como se não houvesse nada a conciliar.
 *
 * Mas há, e é o que o operador quer ver primeiro: o que ele lançou e o banco
 * ainda não confirmou. Um pagamento que nunca aparece no extrato é ou um
 * lançamento que não aconteceu, ou um débito que não saiu — as duas coisas que
 * a conciliação existe para descobrir.
 */
export interface LancamentoPendente {
  id: string;
  tipo: 'PAGAMENTO' | 'RECEITA';
  descricao: string;
  valor: number;
  data: string;
}

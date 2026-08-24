export type ReceitaTipo =
  | 'REPASSE_RECEBIDO'
  | 'APLIC_FINANC_MUNICIPAL'
  | 'APLIC_FINANC_ESTADUAL'
  | 'APLIC_FINANC_FEDERAL'
  | 'OUTRA'
  | 'RECURSO_PROPRIO';

export const RECEITA_TIPO_LABEL: Record<ReceitaTipo, string> = {
  REPASSE_RECEBIDO: 'Repasse recebido',
  APLIC_FINANC_MUNICIPAL: 'Aplic. financeira (repasses municipais)',
  APLIC_FINANC_ESTADUAL: 'Aplic. financeira (repasses estaduais)',
  APLIC_FINANC_FEDERAL: 'Aplic. financeira (repasses federais)',
  OUTRA: 'Outra receita',
  RECURSO_PROPRIO: 'Recurso próprio',
};

/** Verdadeiro para qualquer esfera de aplicação financeira. */
export const ehAplicacaoFinanceira = (t: ReceitaTipo): boolean => t.startsWith('APLIC_FINANC_');

export interface Receita {
  id: string;
  prestacaoId: string;
  tipo: ReceitaTipo;
  descricao: string | null;
  dataPrevista: string | null;
  dataRepasse: string | null;
  fonteRecursoTipo: number | null;
  valor: number;
  /**
   * Identificação bancária da receita — **controle interno**.
   *
   * Não é transmitida: o bloco `receitas` do schema v1.14 é um objeto de totais
   * com `additionalProperties: false`, e não tem onde recebê-la. Quem leva os
   * dados bancários ao TCESP é o bloco **Repasses**, onde eles são obrigatórios.
   * Aqui servem à conciliação do órgão.
   */
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

export interface ReceitaPayload {
  tipo: ReceitaTipo;
  descricao?: string | null;
  dataPrevista?: string | null;
  dataRepasse?: string | null;
  fonteRecursoTipo?: number | null;
  valor: number;
  /** Controle interno — ver `Receita`. */
  banco?: number | null;
  agencia?: number | null;
  contaCorrente?: string | null;
  numeroTransacao?: string | null;
}

export interface Disponibilidade {
  id: string;
  prestacaoId: string;
  banco: number;
  agencia: number;
  conta: string;
  contaTipo: number;
  saldoBancario: number;
  saldoContabil: number;
}

export interface DisponibilidadePayload {
  banco: number;
  agencia: number;
  conta: string;
  contaTipo: number;
  saldoBancario: number;
  saldoContabil: number;
}

export interface Desconto {
  id: string;
  prestacaoId: string;
  data: string;
  descricao: string;
  valor: number;
}

export interface DescontoPayload {
  data: string;
  descricao: string;
  valor: number;
}

export interface Devolucao {
  id: string;
  prestacaoId: string;
  data: string;
  naturezaDevolucaoTipo: number;
  valor: number;
}

export interface DevolucaoPayload {
  data: string;
  naturezaDevolucaoTipo: number;
  valor: number;
}

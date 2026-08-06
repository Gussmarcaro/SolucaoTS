export type ReceitaTipo = 'REPASSE_RECEBIDO' | 'APLIC_FINANCEIRA' | 'OUTRA' | 'RECURSO_PROPRIO';

export const RECEITA_TIPO_LABEL: Record<ReceitaTipo, string> = {
  REPASSE_RECEBIDO: 'Repasse recebido',
  APLIC_FINANCEIRA: 'Aplicação financeira',
  OUTRA: 'Outra receita',
  RECURSO_PROPRIO: 'Recurso próprio',
};

export interface Receita {
  id: string;
  prestacaoId: string;
  tipo: ReceitaTipo;
  descricao: string | null;
  dataPrevista: string | null;
  dataRepasse: string | null;
  fonteRecursoTipo: number | null;
  valor: number;
}

export interface ReceitaPayload {
  tipo: ReceitaTipo;
  descricao?: string | null;
  dataPrevista?: string | null;
  dataRepasse?: string | null;
  fonteRecursoTipo?: number | null;
  valor: number;
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

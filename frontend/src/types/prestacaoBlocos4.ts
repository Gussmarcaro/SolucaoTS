export interface EmpenhoPrestacao {
  id: string;
  prestacaoId: string;
  numero: string;
  dataEmissao: string;
  classificacaoEconomica: string;
  fonteRecursoTipo: number;
  valor: number;
  historico: string | null;
  cpfOrdenadorDespesa: string;
}

export interface EmpenhoPrestacaoPayload {
  numero: string;
  dataEmissao: string;
  classificacaoEconomica: string;
  fonteRecursoTipo: number;
  valor: number;
  historico?: string | null;
  cpfOrdenadorDespesa: string;
}

export interface Repasse {
  id: string;
  prestacaoId: string;
  empenhoId: string | null;
  empenhoNumero: string | null;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number;
  valorRepasse: number;
  justificativaDiferenca: string | null;
  tipoDocumentoBancario: number | null;
  descricaoOutros: string | null;
  numeroDocumento: string | null;
  banco: number | null;
  agencia: number | null;
  conta: string | null;
}

export interface RepassePayload {
  empenhoId?: string | null;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number;
  valorRepasse: number;
  justificativaDiferenca?: string | null;
  numeroDocumento?: string | null;
  banco?: number | null;
  agencia?: number | null;
  conta?: string | null;
}

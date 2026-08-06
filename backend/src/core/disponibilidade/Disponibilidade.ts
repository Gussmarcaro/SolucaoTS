/** Entidade de domínio — Disponibilidade (saldos na data final do período). */
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

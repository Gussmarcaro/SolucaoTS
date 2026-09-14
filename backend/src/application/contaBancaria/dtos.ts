export interface ContaBancariaDTO {
  banco?: number | string;
  agencia?: string | number;
  conta?: string;
  contaTipo?: number | string | null;
  apelido?: string | null;
  observacao?: string | null;
}

/** Conta normalizada e validada, pronta para persistência. */
export interface DadosContaBancaria {
  banco: number;
  agencia: string;
  conta: string;
  contaTipo: number | null;
  apelido: string | null;
  observacao: string | null;
}

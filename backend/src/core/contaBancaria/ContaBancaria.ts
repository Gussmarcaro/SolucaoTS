/** Conta bancária do órgão — o cadastro central. */
export interface ContaBancaria {
  id: string;
  clienteId: string | null;
  banco: number;
  agencia: string;
  conta: string;
  contaTipo: number | null;
  apelido: string | null;
  observacao: string | null;
  ativo: boolean;
}

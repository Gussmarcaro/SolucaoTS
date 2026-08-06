export interface DisponibilidadeDTO {
  banco: number | string;
  agencia: number | string;
  conta: string;
  contaTipo: number | string;
  saldoBancario: number | string;
  saldoContabil: number | string;
}

export interface DadosDisponibilidade {
  banco: number;
  agencia: number;
  conta: string;
  contaTipo: number;
  saldoBancario: number;
  saldoContabil: number;
}

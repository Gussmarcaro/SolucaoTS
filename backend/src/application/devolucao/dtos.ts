export interface DevolucaoDTO {
  data: string;
  naturezaDevolucaoTipo: number | string;
  valor: number | string;
}

export interface DadosDevolucao {
  data: Date;
  naturezaDevolucaoTipo: number;
  valor: number;
}

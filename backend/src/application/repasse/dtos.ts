export interface RepasseDTO {
  empenhoId?: string | null;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number | string;
  valorRepasse: number | string;
  justificativaDiferenca?: string | null;
  tipoDocumentoBancario?: number | string | null;
  descricaoOutros?: string | null;
  numeroDocumento?: string | null;
  banco?: number | string | null;
  agencia?: number | string | null;
  conta?: string | null;
}

export interface DadosRepasse {
  empenhoId: string | null;
  dataPrevista: Date;
  dataRepasse: Date;
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

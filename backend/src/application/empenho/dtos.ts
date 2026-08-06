export interface EmpenhoDTO {
  numeroEmpenho: string;
  anoEmpenho: number | string;
  retificacao?: boolean;
  dataEmissaoEmpenho: string;
}

/** Dados normalizados/validados prontos para persistência. */
export interface DadosEmpenho {
  numeroEmpenho: string;
  anoEmpenho: number;
  retificacao: boolean;
  dataEmissaoEmpenho: Date;
}

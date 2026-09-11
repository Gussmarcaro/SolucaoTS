export interface ProgramaDTO {
  nome: string;
}

export interface MetaDTO {
  codigoMeta: string;
  descricao?: string | null;
  quantificavel?: boolean;
  quantidadePrevista?: number | string | null;
  unidadeMedida?: string | null;
}

/** Dados normalizados/validados de uma meta, prontos para persistência. */
export interface DadosMeta {
  codigoMeta: string;
  descricao: string | null;
  quantificavel: boolean;
  quantidadePrevista: number | null;
  unidadeMedida: string | null;
}

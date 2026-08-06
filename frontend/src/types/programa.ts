export interface Meta {
  id: string;
  programaId: string;
  codigoMeta: string;
  descricao: string | null;
  quantificavel: boolean;
}

export interface Programa {
  id: string;
  ajusteId: string;
  nome: string;
  metas: Meta[];
}

export interface ProgramaPayload {
  nome: string;
}

export interface MetaPayload {
  codigoMeta: string;
  descricao?: string | null;
  quantificavel?: boolean;
}

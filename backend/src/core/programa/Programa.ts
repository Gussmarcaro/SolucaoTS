/** Meta de um Programa (plano de metas do ajuste). */
export interface Meta {
  id: string;
  programaId: string;
  codigoMeta: string;
  descricao: string | null;
  quantificavel: boolean;
}

/** Programa do plano de metas, com suas metas. */
export interface Programa {
  id: string;
  ajusteId: string;
  nome: string;
  metas: Meta[];
}

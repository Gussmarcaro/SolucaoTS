/** Meta de um Programa (plano de metas do ajuste). */
export interface Meta {
  id: string;
  programaId: string;
  codigoMeta: string;
  descricao: string | null;
  quantificavel: boolean;
  /** Quanto se pretende realizar — só nas quantificáveis. Controle interno. */
  quantidadePrevista: number | null;
  /** A unidade do número acima: consultas, atendimentos, horas... */
  unidadeMedida: string | null;
}

/** Programa do plano de metas, com suas metas. */
export interface Programa {
  id: string;
  ajusteId: string;
  nome: string;
  metas: Meta[];
}

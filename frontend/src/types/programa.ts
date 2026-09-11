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
  /** Aceita texto: a tela envia "5000,5" já com o ponto decimal. */
  quantidadePrevista?: number | string | null;
  unidadeMedida?: string | null;
}

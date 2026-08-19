export interface LinhaExecucao {
  ajusteId: string;
  codigoAjuste: string;
  numero: string | null;
  tipoAjuste: string;
  entidadeNome: string;
  valorGlobal: number;
  repassado: number;
  pago: number;
  emPoderDaEntidade: number;
  aRepassar: number;
  /** Fração de 0 a 1; `null` quando o ajuste não tem valor global. */
  execucao: number | null;
  prestacoes: number;
}

export interface LinhaRepasse {
  ajusteId: string;
  codigoAjuste: string;
  entidadeNome: string;
  ano: number;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number;
  valorRepasse: number;
  atrasoDias: number;
  diferencaValor: number;
  justificativa: string | null;
}

export interface LinhaSituacao {
  ano: number;
  status: string;
  quantidade: number;
  valorGlobal: number;
}

export interface ResumoSituacao {
  linhas: LinhaSituacao[];
  ajustesSemPrestacao: {
    ajusteId: string;
    codigoAjuste: string;
    entidadeNome: string;
    dataAssinatura: string;
  }[];
}

/** Atraso a partir do qual a linha ganha destaque — espelha o backend. */
export const ATRASO_RELEVANTE_DIAS = 5;

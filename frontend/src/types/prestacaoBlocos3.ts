export type ResultadoAnalise = 'APROVADO' | 'APROVADO_PARCIALMENTE' | 'REPROVADO';

export interface Glosa {
  id: string;
  prestacaoId: string;
  documentoFiscalId: string | null;
  documentoNumero: string | null;
  pagamentoData: string | null;
  resultadoAnalise: ResultadoAnalise;
  valorGlosa: number | null;
}

export interface GlosaPayload {
  documentoFiscalId?: string | null;
  pagamentoData?: string | null;
  resultadoAnalise: ResultadoAnalise;
  valorGlosa?: number | null;
}

export interface PeriodoRemuneracao {
  mes: number;
  cargaHoraria: number;
  remuneracaoBruta: number;
}

export interface Empregado {
  id: string;
  prestacaoId: string;
  cpf: string;
  dataAdmissao: string;
  dataDemissao: string | null;
  cbo: string;
  cns: string | null;
  salarioContratual: number;
  periodos: PeriodoRemuneracao[];
}

export interface EmpregadoPayload {
  cpf: string;
  dataAdmissao: string;
  dataDemissao?: string | null;
  cbo: string;
  cns?: string | null;
  salarioContratual: number;
  periodos: PeriodoRemuneracao[];
}

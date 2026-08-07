export type CategoriaBem =
  | 'MOVEL_ADQUIRIDO'
  | 'MOVEL_CEDIDO'
  | 'MOVEL_BAIXADO'
  | 'IMOVEL_ADQUIRIDO'
  | 'IMOVEL_CEDIDO'
  | 'IMOVEL_BAIXADO';

export const CATEGORIA_BEM_LABEL: Record<CategoriaBem, string> = {
  MOVEL_ADQUIRIDO: 'Móvel adquirido',
  MOVEL_CEDIDO: 'Móvel cedido',
  MOVEL_BAIXADO: 'Móvel baixado/devolvido',
  IMOVEL_ADQUIRIDO: 'Imóvel adquirido',
  IMOVEL_CEDIDO: 'Imóvel cedido',
  IMOVEL_BAIXADO: 'Imóvel baixado/devolvido',
};

export interface BemPrestacao {
  id: string;
  prestacaoId: string;
  categoria: CategoriaBem;
  numeroPatrimonio: string | null;
  descricao: string;
  data: string;
  valor: number | null;
}

export interface BemPrestacaoPayload {
  categoria: CategoriaBem;
  numeroPatrimonio?: string | null;
  descricao: string;
  data: string;
  valor?: number | null;
}

export interface PeriodoCessao {
  mes: number;
  cargaHoraria: number;
  remuneracaoBruta: number;
}

export interface ServidorPrestacao {
  id: string;
  prestacaoId: string;
  cpf: string;
  dataInicialCessao: string;
  dataFinalCessao: string | null;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: number;
  periodos: PeriodoCessao[];
}

export interface ServidorPrestacaoPayload {
  cpf: string;
  dataInicialCessao: string;
  dataFinalCessao?: string | null;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: number;
  periodos: PeriodoCessao[];
}

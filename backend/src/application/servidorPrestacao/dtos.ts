import type { PeriodoCessao } from '@/core/servidorPrestacao/ServidorPrestacao';

export interface ServidorPrestacaoDTO {
  cpf: string;
  dataInicialCessao: string;
  dataFinalCessao?: string | null;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: number | string;
  periodos?: Array<{ mes: number | string; cargaHoraria: number | string; remuneracaoBruta: number | string }>;
}

export interface DadosServidorPrestacao {
  cpf: string;
  dataInicialCessao: Date;
  dataFinalCessao: Date | null;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: number;
  periodos: PeriodoCessao[];
}

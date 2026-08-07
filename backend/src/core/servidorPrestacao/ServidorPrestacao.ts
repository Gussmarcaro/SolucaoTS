export interface PeriodoCessao {
  mes: number; // 1-12
  cargaHoraria: number;
  remuneracaoBruta: number;
}

/** Entidade de domínio — Servidor Cedido pelo Órgão Concessor (bloco da prestação). */
export interface ServidorPrestacao {
  id: string;
  prestacaoId: string;
  cpf: string;
  dataInicialCessao: string; // 'YYYY-MM-DD'
  dataFinalCessao: string | null;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: number;
  periodos: PeriodoCessao[];
}

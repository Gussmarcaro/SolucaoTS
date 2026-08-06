export interface PeriodoRemuneracao {
  mes: number; // 1-12
  cargaHoraria: number; // proporcional à parceria
  remuneracaoBruta: number; // proporcional à parceria
}

/** Entidade de domínio — Empregado (Relação de Empregados, bloco da prestação). */
export interface Empregado {
  id: string;
  prestacaoId: string;
  cpf: string;
  dataAdmissao: string; // 'YYYY-MM-DD'
  dataDemissao: string | null;
  cbo: string; // 6 dígitos
  cns: string | null; // obrigatório p/ médicos (CBO subgrupo 225)
  salarioContratual: number;
  periodos: PeriodoRemuneracao[];
}

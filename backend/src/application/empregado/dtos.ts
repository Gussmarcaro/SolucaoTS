import type { PeriodoRemuneracao } from '@/core/empregado/Empregado';

export interface EmpregadoDTO {
  cpf: string;
  dataAdmissao: string;
  dataDemissao?: string | null;
  cbo: string;
  cns?: string | null;
  salarioContratual: number | string;
  periodos?: Array<{
    mes: number | string;
    cargaHoraria: number | string;
    remuneracaoBruta: number | string;
  }>;
}

export interface DadosEmpregado {
  cpf: string;
  dataAdmissao: Date;
  dataDemissao: Date | null;
  cbo: string;
  cns: string | null;
  salarioContratual: number;
  periodos: PeriodoRemuneracao[];
}

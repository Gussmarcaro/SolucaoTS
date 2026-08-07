export interface EmpenhoPrestacaoDTO {
  numero: string;
  dataEmissao: string;
  classificacaoEconomica: string;
  fonteRecursoTipo: number | string;
  valor: number | string;
  historico?: string | null;
  cpfOrdenadorDespesa: string;
}

export interface DadosEmpenhoPrestacao {
  numero: string;
  dataEmissao: Date;
  classificacaoEconomica: string;
  fonteRecursoTipo: number;
  valor: number;
  historico: string | null;
  cpfOrdenadorDespesa: string;
}

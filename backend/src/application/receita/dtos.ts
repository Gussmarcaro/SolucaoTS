export interface ReceitaDTO {
  tipo: string;
  descricao?: string | null;
  dataPrevista?: string | null;
  dataRepasse?: string | null;
  fonteRecursoTipo?: number | string | null;
  valor: number | string;
  banco?: number | string | null;
  agencia?: number | string | null;
  contaCorrente?: string | null;
  numeroTransacao?: string | null;
}

export interface DadosReceita {
  tipo: string;
  descricao: string | null;
  dataPrevista: Date | null;
  dataRepasse: Date | null;
  fonteRecursoTipo: number | null;
  valor: number;
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}

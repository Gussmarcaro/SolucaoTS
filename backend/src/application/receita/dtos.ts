export interface ReceitaDTO {
  ajusteId?: string | null;
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
  /** Parceria do lançamento; nula até alguém dizer qual. */
  ajusteId?: string | null;
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

export interface ReceitaDTO {
  tipo: string;
  descricao?: string | null;
  dataPrevista?: string | null;
  dataRepasse?: string | null;
  fonteRecursoTipo?: number | string | null;
  valor: number | string;
}

export interface DadosReceita {
  tipo: string;
  descricao: string | null;
  dataPrevista: Date | null;
  dataRepasse: Date | null;
  fonteRecursoTipo: number | null;
  valor: number;
}

/** Espelha `core/documento/relacaoTransferidos.ts`. */
export interface LinhaRelacao {
  numero: string;
  beneficiario: string;
  cnpj: string | null;
  endereco: string | null;
  data: string | null;
  vigenciaAte: string | null;
  valorGlobal: number;
  objeto: string;
  fonte: string;
  repassadoNoExercicio: number;
}

export interface RelacaoTransferidos {
  anexo: 'RP-04';
  exercicio: number;
  orgaoNome: string;
  localEData: string;
  responsavel: { nome: string | null; cargo: string | null; cpf: string | null; origem: string | null };
  grupos: { tipo: string; rotulo: string; linhas: LinhaRelacao[]; totalValorGlobal: number; totalRepassado: number }[];
  totalRepassado: number;
  nota: string;
  faltando: string[];
}

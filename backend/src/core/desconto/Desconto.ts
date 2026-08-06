/** Entidade de domínio — Desconto (dedução por descumprimento de metas). */
export interface Desconto {
  id: string;
  prestacaoId: string;
  data: string; // 'YYYY-MM-DD'
  descricao: string;
  valor: number;
}

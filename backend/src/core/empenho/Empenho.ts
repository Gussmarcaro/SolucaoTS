/** Entidade de domínio — Empenho do cadastro do Ajuste. */
export interface Empenho {
  id: string;
  ajusteId: string;
  numeroEmpenho: string;
  anoEmpenho: number;
  retificacao: boolean;
  dataEmissaoEmpenho: string; // 'YYYY-MM-DD'
}

/** Entidade de domínio — item do Plano de Aplicação (importado por CSV). */
export interface PlanoAplicacaoItem {
  id: string;
  ajusteId: string;
  categoria: string;
  subcategoria: string;
  ano: number;
  mes: number; // 1-12
  valor: number;
  descricao: string | null;
}

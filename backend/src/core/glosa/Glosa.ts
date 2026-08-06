export type ResultadoAnalise = 'APROVADO' | 'APROVADO_PARCIALMENTE' | 'REPROVADO';

/** Entidade de domínio — Glosa (análise de documento fiscal / folha). */
export interface Glosa {
  id: string;
  prestacaoId: string;
  documentoFiscalId: string | null;
  documentoNumero: string | null; // join p/ exibição
  pagamentoData: string | null; // exclusivo p/ Folha Ordinária
  resultadoAnalise: ResultadoAnalise;
  valorGlosa: number | null; // obrigatório se APROVADO_PARCIALMENTE
}

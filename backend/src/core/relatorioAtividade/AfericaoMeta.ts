export type ResultadoMeta = 'CUMPRIDA' | 'NAO_CUMPRIDA' | 'CUMPRIDA_PARCIALMENTE';

/**
 * Entidade de domínio — aferição de uma meta em um período (Relatório de
 * Atividades, §19). Armazenamento achatado: uma linha por programa+meta+período.
 */
export interface AfericaoMeta {
  id: string;
  prestacaoId: string;
  nomePrograma: string;
  codigoMeta: string;
  periodo: number; // 1..15 conforme a periodicidade
  quantidadeRealizada: number | null; // metas quantificáveis
  resultadoMeta: ResultadoMeta | null; // metas qualitativas não quantificáveis
  justificativaPeriodo: string | null;
  metaAtendida: boolean | null;
  justificativaMeta: string | null;
}

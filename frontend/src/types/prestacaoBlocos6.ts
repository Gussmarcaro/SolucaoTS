export type ResultadoMeta = 'CUMPRIDA' | 'NAO_CUMPRIDA' | 'CUMPRIDA_PARCIALMENTE';

export const RESULTADO_META_LABEL: Record<ResultadoMeta, string> = {
  CUMPRIDA: 'Cumprida',
  NAO_CUMPRIDA: 'Não cumprida',
  CUMPRIDA_PARCIALMENTE: 'Cumprida parcialmente',
};

export interface AfericaoMeta {
  id: string;
  prestacaoId: string;
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  quantidadeRealizada: number | null;
  resultadoMeta: ResultadoMeta | null;
  justificativaPeriodo: string | null;
  metaAtendida: boolean | null;
  justificativaMeta: string | null;
}

export interface AfericaoMetaPayload {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  quantidadeRealizada?: number | null;
  resultadoMeta?: ResultadoMeta | null;
  justificativaPeriodo?: string | null;
  metaAtendida?: boolean;
  justificativaMeta?: string | null;
}

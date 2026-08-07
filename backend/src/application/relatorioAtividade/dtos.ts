import type { ResultadoMeta } from '@/core/relatorioAtividade/AfericaoMeta';

export interface AfericaoMetaDTO {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number | string;
  quantidadeRealizada?: number | string | null;
  resultadoMeta?: ResultadoMeta | null;
  justificativaPeriodo?: string | null;
  metaAtendida?: boolean;
  justificativaMeta?: string | null;
}

export interface DadosAfericaoMeta {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  quantidadeRealizada: number | null;
  resultadoMeta: ResultadoMeta | null;
  justificativaPeriodo: string | null;
  metaAtendida: boolean | null;
  justificativaMeta: string | null;
}

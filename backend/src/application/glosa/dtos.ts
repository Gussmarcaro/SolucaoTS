import type { ResultadoAnalise } from '@/core/glosa/Glosa';

export interface GlosaDTO {
  documentoFiscalId?: string | null;
  pagamentoData?: string | null;
  resultadoAnalise: ResultadoAnalise;
  valorGlosa?: number | string | null;
}

export interface DadosGlosa {
  documentoFiscalId: string | null;
  pagamentoData: Date | null;
  resultadoAnalise: ResultadoAnalise;
  valorGlosa: number | null;
}

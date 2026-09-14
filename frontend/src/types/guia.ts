import type { TipoRetencao } from '@/types/prestacaoBlocos';

/** Guia de recolhimento de um tributo retido, numa competência. */
export interface GuiaRecolhimento {
  id: string;
  clienteId: string | null;
  tipo: TipoRetencao;
  ano: number;
  mes: number;
  valor: number;
  dataVencimento: string | null;
  dataPagamento: string | null;
  numeroDocumento: string | null;
  observacao: string | null;
}

/**
 * O que há a recolher numa competência.
 *
 * `valorApurado` é conta, refeita a cada consulta das notas pagas; `guia` é
 * cadastro. A diferença entre os dois é informação, não erro — ver a tela.
 */
export interface RetencaoApurada {
  tipo: TipoRetencao;
  ano: number;
  mes: number;
  valorApurado: number;
  notas: number;
  guia: GuiaRecolhimento | null;
}

export interface GuiaPayload {
  tipo: TipoRetencao;
  ano: number;
  mes: number;
  valor: number;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  numeroDocumento?: string | null;
  observacao?: string | null;
}

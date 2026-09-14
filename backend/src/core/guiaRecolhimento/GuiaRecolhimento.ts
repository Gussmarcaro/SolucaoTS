import type { TipoRetencao } from '@/core/documentoFiscal/DocumentoFiscal';

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
 * O que há a recolher numa competência, apurado das notas pagas.
 *
 * Não é registro: é consulta. A apuração muda quando alguém corrige uma nota
 * ou lança um pagamento atrasado, e é por isso que ela não se grava — uma
 * fotografia do apurado envelheceria em silêncio, e o usuário recolheria pelo
 * número velho.
 */
export interface RetencaoApurada {
  tipo: TipoRetencao;
  ano: number;
  mes: number;
  /** Soma retida nas notas pagas nesta competência. */
  valorApurado: number;
  /** Quantas notas compõem o valor — o que dá confiança de que ele confere. */
  notas: number;
  /** A guia já emitida para esta competência, se houver. */
  guia: GuiaRecolhimento | null;
}

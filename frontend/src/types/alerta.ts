export type TipoAlerta =
  | 'PRESTACAO_REJEITADA'
  | 'CERTIDAO'
  | 'CADASTRO_AJUSTE'
  | 'CADASTRO_ADITIVO'
  | 'DECLARACAO_NEGATIVA'
  | 'PRESTACAO_CONTAS';

export type UrgenciaAlerta = 'VENCIDO' | 'CRITICO' | 'PROXIMO';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  urgencia: UrgenciaAlerta;
  titulo: string;
  detalhe: string;
  dias: number | null;
  referenciaId: string | null;
}

export const URGENCIA_LABEL: Record<UrgenciaAlerta, string> = {
  VENCIDO: 'Vencidos',
  CRITICO: 'Vencem em até 7 dias',
  PROXIMO: 'Próximos',
};

export const URGENCIA_TONE: Record<UrgenciaAlerta, 'danger' | 'warning' | 'neutral'> = {
  VENCIDO: 'danger',
  CRITICO: 'warning',
  PROXIMO: 'neutral',
};

/** Rótulo do prazo. `null` quando o alerta não é sobre data (rejeição). */
export function rotuloDias(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < 0) return `vencido há ${Math.abs(dias)}d`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias}d`;
}

/**
 * Para onde cada alerta leva. Como na busca global, a rota é decisão da
 * interface — o backend devolve o tipo e o id, e não conhece as telas.
 */
export function rotaDoAlerta(a: Alerta): string {
  switch (a.tipo) {
    case 'PRESTACAO_REJEITADA':
      return a.referenciaId ? `/prestacao-contas/${a.referenciaId}` : '/prestacao-contas';
    case 'CERTIDAO':
      return '/cadastro/entidades';
    case 'CADASTRO_AJUSTE':
    case 'CADASTRO_ADITIVO':
      return a.referenciaId ? `/cadastro/ajustes/${a.referenciaId}` : '/cadastro/ajustes';
    case 'DECLARACAO_NEGATIVA':
      return '/orgaos';
    case 'PRESTACAO_CONTAS':
      return '/prestacao-contas';
  }
}

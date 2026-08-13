/** O que originou o alerta. A interface usa isto para escolher ícone e destino. */
export type TipoAlerta =
  | 'PRESTACAO_REJEITADA'
  | 'CERTIDAO'
  | 'CADASTRO_AJUSTE'
  | 'CADASTRO_ADITIVO'
  | 'DECLARACAO_NEGATIVA'
  | 'PRESTACAO_CONTAS';

/** Quão perto está o prazo. Ordena a lista e colore o item. */
export type UrgenciaAlerta = 'VENCIDO' | 'CRITICO' | 'PROXIMO';

export interface Alerta {
  /**
   * Chave estável do alerta — mesma situação gera sempre o mesmo id.
   *
   * Os alertas são calculados na hora, não gravados: não há linha para
   * referenciar. É esta chave que a dispensa (fase 2) vai guardar, e por isso
   * ela não pode depender da data em que foi calculada.
   */
  id: string;
  tipo: TipoAlerta;
  urgencia: UrgenciaAlerta;
  titulo: string;
  detalhe: string;
  /** Dias corridos até o prazo; negativo quando venceu. `null` sem prazo. */
  dias: number | null;
  /** Id do registro de origem — a tela decide para onde levar. */
  referenciaId: string | null;
}

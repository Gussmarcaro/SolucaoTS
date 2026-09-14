import type { CodigosInexistentes, ContextoConferencia, DadosMontagem } from './tipos';

/** Port que carrega todos os dados de uma prestação para montagem do JSON. */
export interface IMontadorRepository {
  carregar(prestacaoId: string): Promise<DadosMontagem | null>;

  /**
   * O que a conferência de pendências precisa saber sobre o **ajuste** — plano
   * de aplicação, metas, se o órgão empenha.
   *
   * Consulta própria, e não campos acrescentados a `DadosMontagem`: aquilo é o
   * que vira documento JSON, e engordá-lo com dado que não é transmitido
   * confundiria o montador, que é a parte do sistema que menos pode confundir.
   */
  contextoConferencia(prestacaoId: string): Promise<ContextoConferencia | null>;

  /**
   * Confronta os códigos usados na prestação com as tabelas de domínio
   * oficiais e devolve os que não existem nelas. Códigos inexistentes são
   * causa de rejeição no TCESP (§5 #5 e §17 #2), então bloqueiam o envio.
   */
  codigosInexistentes(consulta: {
    cbos: string[];
    classificacoes: Array<{ codigo: string; exercicio: number }>;
  }): Promise<CodigosInexistentes>;
}

import type { CodigosInexistentes, DadosMontagem } from './tipos';

/** Port que carrega todos os dados de uma prestação para montagem do JSON. */
export interface IMontadorRepository {
  carregar(prestacaoId: string): Promise<DadosMontagem | null>;

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

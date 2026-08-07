import type { DadosMontagem } from './tipos';

/** Port que carrega todos os dados de uma prestação para montagem do JSON. */
export interface IMontadorRepository {
  carregar(prestacaoId: string): Promise<DadosMontagem | null>;
}

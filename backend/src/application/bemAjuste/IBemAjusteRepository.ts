import type { BemAjuste } from '@/core/bemAjuste/BemAjuste';
import type { DadosBemAjuste } from './dtos';

/** Port de persistência dos Bens Cedidos do Ajuste (importados por CSV). */
export interface IBemAjusteRepository {
  listarPorAjuste(ajusteId: string): Promise<BemAjuste[]>;
  /** Substitui TODOS os bens do ajuste pelos itens informados. */
  substituir(ajusteId: string, itens: DadosBemAjuste[]): Promise<BemAjuste[]>;
}

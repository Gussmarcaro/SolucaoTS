import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';
import type { DadosPlanoItem } from './dtos';

/** Port de persistência do Plano de Aplicação (no escopo de um Ajuste). */
export interface IPlanoAplicacaoRepository {
  listarPorAjuste(ajusteId: string): Promise<PlanoAplicacaoItem[]>;
  /** Substitui TODO o plano do ajuste pelos itens informados (idempotente). */
  substituir(ajusteId: string, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]>;
}

import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';
import type { DadosPlanoItem } from './dtos';

/** Port de persistência do Plano de Aplicação (no escopo de um Ajuste). */
export interface IPlanoAplicacaoRepository {
  listarPorAjuste(ajusteId: string): Promise<PlanoAplicacaoItem[]>;
  /**
   * As Categorias de Despesa AUDESP declaradas no plano do ajuste.
   *
   * Consulta própria, e não `listarPorAjuste` filtrado na memória: o plano tem
   * uma linha por rubrica **e mês**, então um plano de 40 rubricas traz 480
   * linhas para responder a uma pergunta de meia dúzia de códigos — e a
   * pergunta é feita a cada nota fiscal lançada.
   */
  categoriasDoAjuste(ajusteId: string): Promise<number[]>;
  /** Substitui TODO o plano do ajuste pelos itens informados (idempotente). */
  substituir(ajusteId: string, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]>;
}

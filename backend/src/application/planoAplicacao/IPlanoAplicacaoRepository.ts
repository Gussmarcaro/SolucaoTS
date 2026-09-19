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
  /**
   * As rubricas de TODOS os planos do órgão, sem repetição.
   *
   * Serve a despesa: ela é lançada antes de se saber a qual ajuste vai, e
   * ainda assim precisa citar o item da proposta. Oferecer o que já existe
   * nos planos evita que a mesma rubrica seja escrita de cinco jeitos.
   */
  rubricasDoOrgao(): Promise<{ categoria: string; subcategoria: string }[]>;
  /** Substitui TODO o plano do ajuste pelos itens informados (idempotente). */
  substituir(ajusteId: string, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]>;
  /**
   * Substitui **só o exercício informado**, preservando os demais.
   *
   * O plano é anual e a parceria dura anos: salvar 2027 não pode apagar 2026,
   * cujo exercício já foi prestado e cuja execução ainda se consulta. A
   * substituição total continua existindo para a importação de CSV, que traz o
   * plano inteiro num arquivo só.
   */
  substituirAno(ajusteId: string, ano: number, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]>;
  /** Os exercícios que o plano do ajuste já tem — para oferecer a origem da cópia. */
  exercicios(ajusteId: string): Promise<number[]>;
}

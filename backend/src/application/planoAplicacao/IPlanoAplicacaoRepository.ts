/** Uma rubrica do plano e a Categoria de Despesa AUDESP que ela declara. */
export interface RubricaDoPlano {
  categoria: string;
  subcategoria: string;
  /** Nula nos planos importados antes do campo existir. */
  categoriaDespesaTipo: number | null;
}

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
  /**
   * As rubricas do plano, com a categoria AUDESP de cada uma.
   *
   * `ajusteId` recorta pelo plano **daquela** parceria — que é o que a tela de
   * Despesas precisa: oferecer a rubrica de outro convênio é a mesma família
   * de erro que a lista de contas bancárias já teve. Sem ele, continua sendo o
   * órgão inteiro, que é o que a busca global usa.
   */
  rubricasDoOrgao(ajusteId?: string): Promise<RubricaDoPlano[]>;
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

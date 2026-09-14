/** Números brutos para o quadro Execução × Plano, no escopo de um ajuste. */
export interface IExecucaoPlanoRepository {
  /**
   * O planejado por Categoria AUDESP, no exercício.
   *
   * O plano é gravado por rubrica **e mês**; aqui soma-se o ano inteiro, que é
   * a comparação que interessa — comparar mês a mês exigiria que a despesa
   * caísse exatamente no mês previsto, e ela nunca cai.
   */
  planejadoPorCategoria(
    ajusteId: string,
    ano: number,
  ): Promise<{ categoriaDespesaTipo: number; rubricas: string[]; valor: number }[]>;

  /**
   * O executado por Categoria AUDESP, no exercício.
   *
   * Soma as notas das prestações do ajuste, **aplicando o rateio**: a nota
   * rateada entra pela parcela que cabe a este ajuste, não pelo valor cheio.
   * Sem isso, a conta de luz de cinco ajustes apareceria inteira em cada um.
   */
  executadoPorCategoria(
    ajusteId: string,
    ano: number,
  ): Promise<{ categoriaDespesaTipo: number; valor: number }[]>;
}

/**
 * Uma linha do quadro Execução × Plano.
 *
 * A chave é a **Categoria de Despesa AUDESP**, não a rubrica interna, e isso é
 * imposição do dado: o plano conhece as duas (Salários → código 3), mas a nota
 * fiscal só carrega o código. Duas rubricas que apontem para a mesma categoria
 * compartilham o executado, porque não há como saber qual delas a nota pagou.
 *
 * Por isso `rubricas` vem junto — para a linha dizer o que ela reúne, em vez de
 * mostrar um código nu e deixar a conferência por conta de quem lê.
 */
export interface LinhaExecucaoPlano {
  categoriaDespesaTipo: number;
  /** As rubricas do plano que declaram esta categoria. Vazio no gasto fora do plano. */
  rubricas: string[];
  /** Soma anual do plano para esta categoria. */
  planejado: number;
  /** Soma das notas fiscais da prestação, já aplicado o rateio. */
  executado: number;
}

export interface ExecucaoPlano {
  ajusteId: string;
  ano: number;
  linhas: LinhaExecucaoPlano[];
  /**
   * Houve execução em categoria que o plano não prevê?
   *
   * Vale destacar à parte porque é a irregularidade que a regra do plano
   * existe para impedir — e ela aparece nos ajustes antigos, cujo plano não
   * tem categorias e por isso não trava o lançamento.
   */
  temGastoForaDoPlano: boolean;
}

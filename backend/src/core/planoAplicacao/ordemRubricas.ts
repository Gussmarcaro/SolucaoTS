/**
 * A ordem das rubricas é **dado do usuário**, e estava sendo jogada fora.
 *
 * O plano é gravado uma linha por rubrica **e mês**, e a leitura ordenava por
 * `categoria, subcategoria` — alfabético. Resultado: o quadro digitado na ordem
 * do plano de trabalho (1. Recursos Humanos … 7. Combustível … 16. Outras
 * Despesas) voltava da primeira leitura como "Combustível, Gêneros
 * Alimentícios, Materiais Médico-Hospitalares…", e o usuário tinha de reler um
 * documento que já conhecia de cor, em outra ordem.
 *
 * Não dá para derivar a ordem do modelo de 16 seções: **a rubrica é livre**. O
 * modelo é semente, cada entidade apresenta o plano do seu jeito, e tentar
 * reconhecer a categoria por nome acertaria em quem usa o padrão e erraria em
 * quem não usa — justamente quem mais precisa da ordem preservada.
 *
 * Então a ordem é guardada. E é **derivada do que chega**, nunca enviada pelo
 * cliente: aceitar um `ordem` do payload permitiria gravar uma ordem que a tela
 * não mostra, e nada acusaria — a mesma decisão do percentual do rateio e da
 * fonte de recurso da conta bancária.
 */

/** O mínimo que identifica uma rubrica. */
export interface Rubrica {
  categoria?: string | null;
  subcategoria?: string | null;
}

/**
 * Numera as rubricas pela **primeira aparição** na lista recebida.
 *
 * Todas as doze linhas de uma rubrica (uma por mês) recebem o mesmo número, que
 * é o que mantém o grupo inteiro junto na leitura. Numerar linha a linha
 * espalharia os meses de uma mesma categoria pelo quadro.
 *
 * Começa em **1**. O zero fica reservado para as linhas gravadas antes desta
 * coluna existir: elas caem no desempate alfabético de antes, e nada se move
 * sozinho no plano de quem não salvou de novo.
 */
export function numerarRubricas<T extends Rubrica>(itens: T[]): (T & { ordem: number })[] {
  const numeroDe = new Map<string, number>();
  let proximo = 0;

  return itens.map((i) => {
    // Rubrica sem nome (o cronograma a aceita vazia, porque nasceu agregado)
    // forma uma chave própria e estável, em vez de colidir com outra vazia.
    const chave = `${i.categoria ?? ''}\u0000${i.subcategoria ?? ''}`;
    if (!numeroDe.has(chave)) numeroDe.set(chave, ++proximo);
    return { ...i, ordem: numeroDe.get(chave)! };
  });
}

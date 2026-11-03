/**
 * Despesas de um período, nos três recortes que a prestação de contas pede.
 *
 * ## Por que os três quadros são um cálculo só
 *
 * O relatório do dia a dia pede *contabilizadas*, *não pagas* e *pagas*; o
 * anexo oficial do Tribunal (RP-06/08/10/12/14) pede os mesmos fatos somados
 * por categoria, em quatro colunas:
 *
 * - **(H)** contabilizadas em exercícios **anteriores** e pagas neste;
 * - **(I)** contabilizadas **neste** e pagas neste;
 * - **(J = H + I)** total pago no período;
 * - **a pagar**: contabilizadas neste período e ainda não pagas ao fim dele.
 *
 * São leituras do mesmo par (data de emissão × data de pagamento). Calcular
 * cada quadro por conta própria daria três respostas que se contradizem num
 * centavo — e a contradição apareceria no documento assinado.
 *
 * ## As duas datas, e por que nenhuma delas basta sozinha
 *
 * **Contabilizada** é pela data do documento; **paga** é pela data do
 * pagamento. Uma nota de dezembro paga em janeiro conta como despesa de
 * dezembro e como desembolso de janeiro — é justamente o que as colunas (H) e
 * "a pagar" existem para mostrar. Filtrar tudo por uma data só esconderia
 * metade do movimento do período.
 *
 * Função pura, conferida sem banco: o número vai para documento assinado pelo
 * dirigente, e errá-lo não quebra tela nenhuma.
 */

export interface PagamentoDaDespesa {
  /** `YYYY-MM-DD`. */
  data: string;
  valor: number;
  /**
   * O identificador da linha do extrato conciliada com este pagamento.
   *
   * É o "código do pagamento do extrato" que o quadro de documentos
   * comprobatórios pede — e ele só existe porque a conciliação foi feita.
   */
  codigoExtrato: string | null;
}

export interface DespesaBruta {
  id: string;
  /** `YYYY-MM-DD` — a data do documento, que é o que "contabilizada" significa. */
  dataEmissao: string;
  /**
   * O valor que cabe a este recorte.
   *
   * Na nota rateada dentro de um ajuste, é a **parcela** dele — não o valor
   * cheio. Somar a nota inteira em cada parceria do quadro contaria a mesma
   * despesa duas vezes, que é exatamente o erro que o rateio existe para
   * impedir.
   */
  valorContabil: number;
  pagamentos: PagamentoDaDespesa[];
}

export interface Periodo {
  /** `YYYY-MM-DD`, inclusivo. */
  de: string;
  /** `YYYY-MM-DD`, inclusivo. */
  ate: string;
}

/** Uma linha do quadro, com o que o período fez com aquela despesa. */
export interface LinhaDespesa {
  id: string;
  dataEmissao: string;
  valorContabil: number;
  /** Soma paga **dentro** do período. */
  pagoNoPeriodo: number;
  /** Quanto falta pagar ao **fim** do período (nunca negativo). */
  aPagar: number;
  /** Os pagamentos do período, para o quadro de comprovantes. */
  pagamentos: PagamentoDaDespesa[];
}

export interface TotaisDespesas {
  /** Soma das despesas com documento emitido no período. */
  contabilizado: number;
  /** (H) emitidas **antes** do período e pagas dentro dele. */
  anterioresPagasNoPeriodo: number;
  /** (I) emitidas **e** pagas dentro do período. */
  contabilizadoEPagoNoPeriodo: number;
  /** (J = H + I) tudo que saiu no período. */
  pagoNoPeriodo: number;
  /** Emitidas no período e ainda em aberto ao fim dele. */
  aPagar: number;
}

export interface DespesasDoPeriodo {
  /** Documento emitido no período — pago ou não. */
  contabilizadas: LinhaDespesa[];
  /** Emitido no período e ainda em aberto ao fim dele. */
  naoPagas: LinhaDespesa[];
  /** Pagas dentro do período, **qualquer que seja a emissão**. */
  pagas: LinhaDespesa[];
  totais: TotaisDespesas;
}

const cent = (n: number) => Math.round(n * 100) / 100;

/** A data está no período? Comparação de texto ISO, que ordena igual à data. */
const dentro = (data: string, p: Periodo) => data >= p.de && data <= p.ate;

export function despesasDoPeriodo(notas: DespesaBruta[], p: Periodo): DespesasDoPeriodo {
  const contabilizadas: LinhaDespesa[] = [];
  const naoPagas: LinhaDespesa[] = [];
  const pagas: LinhaDespesa[] = [];

  const totais: TotaisDespesas = {
    contabilizado: 0,
    anterioresPagasNoPeriodo: 0,
    contabilizadoEPagoNoPeriodo: 0,
    pagoNoPeriodo: 0,
    aPagar: 0,
  };

  for (const nota of notas) {
    const noPeriodo = nota.pagamentos.filter((x) => dentro(x.data, p));
    const pagoNoPeriodo = cent(noPeriodo.reduce((s, x) => s + x.valor, 0));
    /*
     * O saldo é apurado **até o fim do período**, não até hoje.
     *
     * Pagamento feito depois não pode apagar a dívida que existia no
     * fechamento: o quadro descreve a situação daquela data, e relê-lo meses
     * depois tem de dar o mesmo número — senão o documento assinado deixa de
     * bater com o sistema sem ninguém ter mexido em nada.
     */
    const pagoAteOFim = cent(
      nota.pagamentos.filter((x) => x.data <= p.ate).reduce((s, x) => s + x.valor, 0),
    );
    const aPagar = Math.max(cent(nota.valorContabil - pagoAteOFim), 0);

    const linha: LinhaDespesa = {
      id: nota.id,
      dataEmissao: nota.dataEmissao,
      valorContabil: cent(nota.valorContabil),
      pagoNoPeriodo,
      aPagar,
      pagamentos: noPeriodo,
    };

    const emitidaNoPeriodo = dentro(nota.dataEmissao, p);

    if (emitidaNoPeriodo) {
      contabilizadas.push(linha);
      totais.contabilizado = cent(totais.contabilizado + linha.valorContabil);
      totais.contabilizadoEPagoNoPeriodo = cent(totais.contabilizadoEPagoNoPeriodo + pagoNoPeriodo);
      if (aPagar > 0) {
        naoPagas.push(linha);
        totais.aPagar = cent(totais.aPagar + aPagar);
      }
    } else if (pagoNoPeriodo > 0) {
      totais.anterioresPagasNoPeriodo = cent(totais.anterioresPagasNoPeriodo + pagoNoPeriodo);
    }

    if (pagoNoPeriodo > 0) {
      pagas.push(linha);
      totais.pagoNoPeriodo = cent(totais.pagoNoPeriodo + pagoNoPeriodo);
    }
  }

  // Data do documento nos dois primeiros; data do desembolso no terceiro — é a
  // ordem em que cada quadro é conferido contra o dossiê.
  contabilizadas.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
  naoPagas.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
  pagas.sort(
    (a, b) =>
      (a.pagamentos[0]?.data ?? a.dataEmissao).localeCompare(
        b.pagamentos[0]?.data ?? b.dataEmissao,
      ) || a.dataEmissao.localeCompare(b.dataEmissao),
  );

  return { contabilizadas, naoPagas, pagas, totais };
}

import { despesasDoPeriodo, type TotaisDespesas } from '@/core/relatorio/despesasPeriodo';
import { BusinessError } from '@/shared/errors';

/** Data ISO — o formato que os campos de data da tela enviam. */
const ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/**
 * Relatórios gerenciais — as perguntas que o gestor faz e que nenhuma tela de
 * cadastro responde.
 *
 * Não são documentos para o TCESP (isso é o Espelho e a transmissão) nem para
 * o portal (isso é a Transparência). São para dentro: onde está o dinheiro,
 * o que atrasou e o que falta prestar.
 */

/** Uma linha de "execução por ajuste". */
export interface LinhaExecucao {
  ajusteId: string;
  codigoAjuste: string;
  numero: string | null;
  tipoAjuste: string;
  entidadeNome: string;
  valorGlobal: number;
  /** Somatório de `RepassePrestacao.valorRepasse` das prestações do ajuste. */
  repassado: number;
  /** Somatório de `Pagamento.valor`. */
  pago: number;
  /** Repassado − pago: o que saiu do órgão e ainda não virou despesa. */
  emPoderDaEntidade: number;
  /** Valor global − repassado: o que o órgão ainda deve repassar. */
  aRepassar: number;
  /** Repassado ÷ valor global. `null` quando o ajuste não tem valor. */
  execucao: number | null;
  prestacoes: number;
}

/** Uma linha de "repasses: previsto × realizado". */
export interface LinhaRepasse {
  ajusteId: string;
  codigoAjuste: string;
  entidadeNome: string;
  ano: number;
  dataPrevista: string;
  dataRepasse: string;
  valorPrevisto: number;
  valorRepasse: number;
  /** Dias entre o previsto e o efetivo. Negativo = adiantado. */
  atrasoDias: number;
  diferencaValor: number;
  justificativa: string | null;
}

/** Uma linha de "prestações por situação". */
export interface LinhaSituacao {
  ano: number;
  status: string;
  quantidade: number;
  valorGlobal: number;
}

export interface ResumoSituacao {
  linhas: LinhaSituacao[];
  /** Ajustes sem nenhuma prestação — o que nem começou. */
  ajustesSemPrestacao: { ajusteId: string; codigoAjuste: string; entidadeNome: string; dataAssinatura: string }[];
}

/** Uma linha de "concentração de fornecedores". */
export interface LinhaFornecedor {
  credorTipoDoc: string;
  credorNumeroDoc: string;
  credorNome: string | null;
  /** Quantas notas desse credor entraram no recorte. */
  notas: number;
  valor: number;
  /** Fatia deste credor no total. */
  percentual: number;
  /**
   * Soma das fatias até esta linha.
   *
   * **É o que transforma um ranking em análise de concentração.** "O maior
   * fornecedor tem 40%" diz pouco sozinho; "três fornecedores somam 80%" é a
   * frase que a fiscalização usa.
   */
  acumulado: number;
}

export interface ResumoFornecedores {
  linhas: LinhaFornecedor[];
  total: number;
  /** Quantos credores distintos no recorte. */
  credores: number;
  /** Fatia do maior credor. `null` quando não há despesa. */
  maiorFatia: number | null;
  /**
   * Quantos credores bastam para somar 80% da despesa.
   *
   * O número que responde à pergunta de uma vez: 1 em 40 é concentração; 30
   * em 40 é pulverização. `null` quando não há despesa.
   */
  credoresPara80: number | null;
}

export interface FiltroRelatorio {
  ajusteId?: string;
  ano?: number;
}

/**
 * O recorte dos quadros de despesa: **um período, não um exercício**.
 *
 * Os demais relatórios filtram por ano porque respondem a perguntas anuais.
 * Estes são o que a entidade monta todo mês para a prestação — e o mesmo
 * cálculo, com o período do exercício, é o que preenche o anexo do Tribunal.
 */
export interface FiltroPeriodo {
  de: string;
  ate: string;
  ajusteId?: string;
}

/** Uma linha dos quadros de despesa, com o que a tela e o anexo mostram. */
export interface DespesaDoPeriodo {
  id: string;
  dataEmissao: string;
  /** Tipo + número, como o quadro chama de "especificação do documento". */
  tipoDocumento: string | null;
  numero: string;
  descricao: string;
  credorNome: string | null;
  credorTipoDoc: string;
  credorNumeroDoc: string;
  /** Código da tabela do TCESP; o rótulo é resolvido na tela. */
  categoriaDespesaTipo: number;
  propostaCategoria: string | null;
  propostaSubcategoria: string | null;
  /** Na nota rateada dentro de um ajuste, já é a **parcela** dele. */
  valorContabil: number;
  pagoNoPeriodo: number;
  aPagar: number;
  pagamentos: { data: string; valor: number; codigoExtrato: string | null }[];
}

/**
 * O RESUMO do relatório — o que entrou e o que saiu no período.
 *
 * As linhas são as mesmas do anexo oficial (A a G), e por isso os tipos de
 * receita do cadastro foram feitos para casar com elas.
 */
export interface ResumoDoPeriodo {
  repasses: number;
  rendimentos: number;
  outrasReceitas: number;
  recursosProprios: number;
  /** Repasses + rendimentos + outras (sem o recurso próprio, que é da entidade). */
  totalRecursosPublicos: number;
  /** Com o recurso próprio — o (G) do anexo. */
  totalDisponivel: number;
}

export interface RelatorioDespesas {
  periodo: { de: string; ate: string };
  contabilizadas: DespesaDoPeriodo[];
  naoPagas: DespesaDoPeriodo[];
  pagas: DespesaDoPeriodo[];
  totais: TotaisDespesas;
  resumo: ResumoDoPeriodo;
}

/** A nota como o banco a entrega, antes de o período a classificar. */
export interface NotaCrua extends Omit<DespesaDoPeriodo, 'pagoNoPeriodo' | 'aPagar'> {
  pagamentos: { data: string; valor: number; codigoExtrato: string | null }[];
}

/** Receitas do período, já somadas por tipo. */
export interface ReceitasPorTipo {
  tipo: string;
  valor: number;
}

export interface IRelatorioRepository {
  execucao(filtro: FiltroRelatorio): Promise<LinhaExecucao[]>;
  repasses(filtro: FiltroRelatorio): Promise<LinhaRepasse[]>;
  situacao(filtro: FiltroRelatorio): Promise<ResumoSituacao>;
  /** Despesa por credor, já somada. A ordenação e os percentuais são do caso de uso. */
  fornecedores(filtro: FiltroRelatorio): Promise<
    Omit<LinhaFornecedor, 'percentual' | 'acumulado'>[]
  >;
  /**
   * As notas que o período alcança — emitidas **ou** pagas dentro dele.
   *
   * Os dois braços são necessários: a nota de dezembro paga em janeiro não é
   * despesa de janeiro, mas é desembolso de janeiro, e some do relatório se a
   * consulta olhar só para a emissão.
   */
  notasDoPeriodo(filtro: FiltroPeriodo): Promise<NotaCrua[]>;
  /** Receitas recebidas no período, somadas por tipo. */
  receitasDoPeriodo(filtro: FiltroPeriodo): Promise<ReceitasPorTipo[]>;
}

/** Atraso a partir do qual a linha merece destaque na tela. */
export const ATRASO_RELEVANTE_DIAS = 5;

export class RelatorioUseCases {
  constructor(private readonly repo: IRelatorioRepository) {}

  private normalizar(filtro: FiltroRelatorio): FiltroRelatorio {
    const out: FiltroRelatorio = {};
    if (filtro.ajusteId?.trim()) out.ajusteId = filtro.ajusteId.trim();
    const ano = Number(filtro.ano);
    if (Number.isInteger(ano) && ano > 1990 && ano < 2100) out.ano = ano;
    return out;
  }

  /**
   * Execução financeira por ajuste.
   *
   * Responde a pergunta que abre qualquer reunião de acompanhamento: de tudo
   * que foi pactuado, quanto já saiu do órgão e quanto a entidade já gastou.
   * A diferença entre os dois é dinheiro parado na conta da OSC — que não é
   * irregular por si, mas é o número que ninguém tem à mão.
   */
  async execucao(filtro: FiltroRelatorio = {}): Promise<LinhaExecucao[]> {
    const linhas = await this.repo.execucao(this.normalizar(filtro));
    // Maior execução primeiro: quem está perto do fim é quem precisa de
    // atenção para encerrar, e quem está em zero salta à vista no rodapé.
    return linhas.sort((a, b) => (b.execucao ?? -1) - (a.execucao ?? -1));
  }

  /**
   * Repasses previstos × realizados.
   *
   * O atraso de repasse é achado clássico do TCESP, e o dado para enxergá-lo
   * sempre esteve ali: `RepassePrestacao` guarda a data prevista e a efetiva
   * no mesmo registro. Faltava alguém subtrair uma da outra.
   */
  async repasses(filtro: FiltroRelatorio = {}): Promise<LinhaRepasse[]> {
    const linhas = await this.repo.repasses(this.normalizar(filtro));
    // Maior atraso primeiro — é o que se quer justificar.
    return linhas.sort((a, b) => b.atrasoDias - a.atrasoDias);
  }

  /** Panorama das prestações por exercício e situação. */
  situacao(filtro: FiltroRelatorio = {}): Promise<ResumoSituacao> {
    return this.repo.situacao(this.normalizar(filtro));
  }

  /**
   * Concentração de fornecedores — para quem a entidade compra.
   *
   * É o achado que a fiscalização procura e que o sistema tinha como responder
   * desde sempre: `DocumentoFiscal` guarda o credor em toda nota, e ninguém
   * somava por ele. Até aqui, descobrir que 70% da despesa foi para um único
   * fornecedor exigia exportar tudo e montar tabela dinâmica.
   *
   * **Concentração não é irregularidade.** Pode ser o aluguel do imóvel, ou a
   * folha terceirizada. O relatório não acusa ninguém — ele põe diante dos
   * olhos um número que ninguém calcula à mão, e cuja explicação o gestor
   * precisa ter pronta antes de o Tribunal perguntar.
   *
   * A aritmética fica aqui, e não no banco, de propósito: percentual e
   * acumulado dependem da **ordem**, e ordenação dentro de agregação é o tipo
   * de coisa que muda de resultado entre bancos.
   */
  async fornecedores(filtro: FiltroRelatorio = {}): Promise<ResumoFornecedores> {
    const brutas = await this.repo.fornecedores(this.normalizar(filtro));

    // Maior primeiro — é o que a concentração significa, e o que faz o
    // acumulado subir depressa quando há concentração de verdade.
    const ordenadas = [...brutas].sort((a, b) => b.valor - a.valor);
    const total = ordenadas.reduce((s, l) => s + l.valor, 0);

    let soma = 0;
    const linhas: LinhaFornecedor[] = ordenadas.map((l) => {
      soma += l.valor;
      return {
        ...l,
        // Divisão por zero acontece de verdade: prestação só com nota de valor
        // zero, ou recorte sem despesa. `0` em vez de `NaN` porque a tela
        // formata o número, e `NaN%` é pior que `0%`.
        percentual: total > 0 ? (l.valor / total) * 100 : 0,
        acumulado: total > 0 ? (soma / total) * 100 : 0,
      };
    });

    /*
     * Quantos credores somam 80%.
     *
     * O corte em 80 é a leitura de Pareto, e é convenção — não regra do
     * TCESP. Serve para dar uma frase à tela ("3 de 40 credores concentram
     * 80% da despesa"), não para reprovar nada. Por isso o número aparece e
     * nada é pintado de vermelho por causa dele.
     */
    const indice = linhas.findIndex((l) => l.acumulado >= 80);

    return {
      linhas,
      total,
      credores: linhas.length,
      maiorFatia: linhas.length ? linhas[0].percentual : null,
      credoresPara80: total > 0 && indice >= 0 ? indice + 1 : null,
    };
  }

  /**
   * Os três quadros de despesa do período, mais o resumo do que entrou.
   *
   * É o relatório que a entidade monta todo mês e o mesmo cálculo que, com o
   * período do exercício, preenche as quatro colunas do anexo oficial. A
   * classificação fica no core (`despesasDoPeriodo`), pura e conferida sem
   * banco: três quadros calculados por conta própria dariam três respostas
   * que se contradizem num centavo, e a contradição iria para o documento
   * assinado.
   */
  async despesas(filtro: FiltroPeriodo): Promise<RelatorioDespesas> {
    const periodo = this.normalizarPeriodo(filtro);
    const [notas, receitas] = await Promise.all([
      this.repo.notasDoPeriodo(periodo),
      this.repo.receitasDoPeriodo(periodo),
    ]);

    const classificado = despesasDoPeriodo(
      notas.map((n) => ({
        id: n.id,
        dataEmissao: n.dataEmissao,
        valorContabil: n.valorContabil,
        pagamentos: n.pagamentos,
      })),
      periodo,
    );

    // A classificação devolve id + números; o resto da linha vem da nota.
    const porId = new Map(notas.map((n) => [n.id, n]));
    const juntar = (linhas: { id: string; pagoNoPeriodo: number; aPagar: number; pagamentos: NotaCrua['pagamentos'] }[]) =>
      linhas.flatMap((l) => {
        const n = porId.get(l.id);
        return n ? [{ ...n, pagoNoPeriodo: l.pagoNoPeriodo, aPagar: l.aPagar, pagamentos: l.pagamentos }] : [];
      });

    const soma = (prefixo: string) =>
      Math.round(
        receitas.filter((r) => r.tipo.startsWith(prefixo)).reduce((s, r) => s + r.valor, 0) * 100,
      ) / 100;

    const repasses = soma('REPASSE_RECEBIDO');
    const rendimentos = soma('APLIC_FINANC');
    const outrasReceitas = soma('OUTRA');
    const recursosProprios = soma('RECURSO_PROPRIO');
    const totalRecursosPublicos = Math.round((repasses + rendimentos + outrasReceitas) * 100) / 100;

    return {
      periodo: { de: periodo.de, ate: periodo.ate },
      contabilizadas: juntar(classificado.contabilizadas),
      naoPagas: juntar(classificado.naoPagas),
      pagas: juntar(classificado.pagas),
      totais: classificado.totais,
      resumo: {
        repasses,
        rendimentos,
        outrasReceitas,
        recursosProprios,
        totalRecursosPublicos,
        totalDisponivel: Math.round((totalRecursosPublicos + recursosProprios) * 100) / 100,
      },
    };
  }

  /**
   * O período é **obrigatório**, e recusado quando inválido.
   *
   * Sem ele a consulta varreria o órgão inteiro para responder a uma pergunta
   * de um mês — e o relatório é de fechamento, não de tudo que já houve.
   */
  private normalizarPeriodo(filtro: FiltroPeriodo): FiltroPeriodo {
    const de = (filtro.de ?? '').trim();
    const ate = (filtro.ate ?? '').trim();
    if (!ISO.test(de) || !ISO.test(ate))
      throw new BusinessError('Informe o período (data inicial e final) no formato AAAA-MM-DD.');
    if (ate < de) throw new BusinessError('A data final do período é anterior à inicial.');
    return { de, ate, ajusteId: filtro.ajusteId?.trim() || undefined };
  }
}

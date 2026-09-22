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

export interface IRelatorioRepository {
  execucao(filtro: FiltroRelatorio): Promise<LinhaExecucao[]>;
  repasses(filtro: FiltroRelatorio): Promise<LinhaRepasse[]>;
  situacao(filtro: FiltroRelatorio): Promise<ResumoSituacao>;
  /** Despesa por credor, já somada. A ordenação e os percentuais são do caso de uso. */
  fornecedores(filtro: FiltroRelatorio): Promise<
    Omit<LinhaFornecedor, 'percentual' | 'acumulado'>[]
  >;
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
}

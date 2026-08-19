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

export interface FiltroRelatorio {
  ajusteId?: string;
  ano?: number;
}

export interface IRelatorioRepository {
  execucao(filtro: FiltroRelatorio): Promise<LinhaExecucao[]>;
  repasses(filtro: FiltroRelatorio): Promise<LinhaRepasse[]>;
  situacao(filtro: FiltroRelatorio): Promise<ResumoSituacao>;
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
}

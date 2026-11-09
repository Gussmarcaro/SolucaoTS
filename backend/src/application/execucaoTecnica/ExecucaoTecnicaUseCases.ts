import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { IProgramaRepository } from '@/application/programa/IProgramaRepository';
import type { IRelatorioAtividadeRepository } from '@/application/relatorioAtividade/IRelatorioAtividadeRepository';
import type { RelatorioAtividadeUseCases } from '@/application/relatorioAtividade/RelatorioAtividadeUseCases';
import type { AfericaoMetaDTO } from '@/application/relatorioAtividade/dtos';
import type { AfericaoMeta } from '@/core/relatorioAtividade/AfericaoMeta';
import type { Programa } from '@/core/programa/Programa';
import { BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Execução Técnica — o **realizado** das metas, lançado ao longo do ano.
 *
 * O previsto já está no Plano de Metas do ajuste (`MetaPeriodicidade`), digitado
 * na celebração. O que faltava era onde registrar o que de fato aconteceu em
 * cada período, **sem esperar a prestação**: a entidade apura mês a mês, e
 * guardar isso numa planilha até junho é como o número se perde.
 *
 * ## Não existe um segundo lugar para o realizado
 *
 * Este caso de uso **não tem tabela própria**. Ele grava exatamente nas linhas
 * de `RelatorioAtividadeMeta` — o bloco §19 da prestação, que é o que se
 * transmite ao TCESP. Uma tabela paralela de "execução técnica" daria dois
 * números para o mesmo fato, e a divergência só apareceria no Espelho, na
 * véspera de transmitir.
 *
 * A consequência é que **o lançamento precisa da prestação do exercício**. Ela
 * é anual e nasce no começo do ano; quando não existe, dizemos isso e apontamos
 * o caminho, em vez de criá-la por conta própria — criar prestação é ato do
 * módulo de Prestação de Contas, não efeito colateral de uma tela de execução.
 *
 * ## E a validação é a mesma
 *
 * Escrever é delegado a `RelatorioAtividadeUseCases`. Repetir aqui a regra de
 * "quantidade OU resultado" e a da justificativa obrigatória criaria duas
 * versões da mesma exigência, e a tela técnica aceitaria o que a prestação
 * recusa — descoberto meses depois, pelo contador.
 */
export class ExecucaoTecnicaUseCases {
  constructor(
    private readonly ajustes: IAjusteRepository,
    private readonly prestacoes: IPrestacaoRepository,
    private readonly programas: IProgramaRepository,
    private readonly afericoes: IRelatorioAtividadeRepository,
    private readonly relatorio: RelatorioAtividadeUseCases,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!ajusteId?.trim()) throw new BusinessError('Escolha a parceria.');
    // A busca passa pela extension de tenant: ajuste de outro órgão "não
    // existe", e é por isso que esta checagem basta como recorte.
    if (!(await this.ajustes.buscarPorId(ajusteId))) throw new NotFoundError('Ajuste não encontrado.');
  }

  private exercicioValido(valor: unknown): number {
    const n = typeof valor === 'string' ? Number(valor) : (valor as number);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new BusinessError('Exercício inválido.');
    return n;
  }

  /**
   * O quadro da tela: as metas do ajuste e o que já foi aferido no exercício.
   *
   * `prestacaoId` nulo não é erro — é o estado normal de quem ainda não abriu
   * a prestação do ano. A tela mostra os previstos assim mesmo, porque ver o
   * que foi pactuado não depende de haver onde lançar.
   */
  async painel(
    ajusteIdBruto: string,
    exercicioBruto: unknown,
  ): Promise<{
    exercicio: number;
    prestacaoId: string | null;
    programas: Programa[];
    afericoes: AfericaoMeta[];
  }> {
    const ajusteId = ajusteIdBruto?.trim();
    await this.garantirAjuste(ajusteId);
    const exercicio = this.exercicioValido(exercicioBruto);

    const prestacao = await this.prestacoes.buscarPorAjusteAno(ajusteId, exercicio);
    const [programas, afericoes] = await Promise.all([
      this.programas.listarPorAjuste(ajusteId),
      prestacao ? this.afericoes.listarPorPrestacao(prestacao.id) : Promise.resolve([]),
    ]);

    return { exercicio, prestacaoId: prestacao?.id ?? null, programas, afericoes };
  }

  /**
   * Grava o realizado de um período — cria ou substitui.
   *
   * **É upsert, e de propósito.** A tela é um quadro de períodos, não uma
   * grade de registros: quem digita o número de fevereiro não sabe nem precisa
   * saber se já existe uma linha. Exigir que soubesse devolveria "já existe
   * uma aferição desta meta neste período" para quem só quis corrigir um
   * número.
   */
  async registrar(ajusteIdBruto: string, exercicioBruto: unknown, input: AfericaoMetaDTO): Promise<AfericaoMeta> {
    const ajusteId = ajusteIdBruto?.trim();
    await this.garantirAjuste(ajusteId);
    const exercicio = this.exercicioValido(exercicioBruto);

    const prestacao = await this.prestacoes.buscarPorAjusteAno(ajusteId, exercicio);
    if (!prestacao)
      throw new BusinessError(
        `Não há prestação de contas de ${exercicio} para esta parceria. Abra-a em Prestação de Contas — é nela que o realizado é guardado e transmitido.`,
      );

    const periodo = typeof input.periodo === 'string' ? Number(input.periodo) : input.periodo;
    const nomePrograma = input.nomePrograma?.trim() ?? '';
    const codigoMeta = input.codigoMeta?.trim() ?? '';

    const existente =
      Number.isInteger(periodo) && nomePrograma && codigoMeta
        ? await this.afericoes.buscarDuplicado(prestacao.id, nomePrograma, codigoMeta, periodo as number)
        : null;

    return existente
      ? this.relatorio.atualizar(prestacao.id, existente.id, input)
      : this.relatorio.criar(prestacao.id, input);
  }

  /** Apaga o realizado de um período — o previsto, do cadastro, fica intacto. */
  async remover(ajusteIdBruto: string, exercicioBruto: unknown, id: string): Promise<void> {
    const ajusteId = ajusteIdBruto?.trim();
    await this.garantirAjuste(ajusteId);
    const exercicio = this.exercicioValido(exercicioBruto);

    const prestacao = await this.prestacoes.buscarPorAjusteAno(ajusteId, exercicio);
    if (!prestacao) throw new NotFoundError('Aferição não encontrada.');
    await this.relatorio.excluir(prestacao.id, id);
  }
}

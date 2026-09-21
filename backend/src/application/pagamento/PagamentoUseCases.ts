import type { Pagamento } from '@/core/pagamento/Pagamento';
import type { IPagamentoRepository } from './IPagamentoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosPagamento, PagamentoDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import { ratearValor } from '@/core/rateio/Rateio';
import type { IRateioRepository } from '@/application/rateio/IRateioRepository';
import type { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import type { RatearPagamentoDTO } from './dtos';

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Centavos: o dinheiro nunca carrega a sujeira do ponto flutuante. */
const arredondarCentavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function validar(input: PagamentoDTO): DadosPagamento {
  let dataPagamento: Date;
  try {
    dataPagamento = parseDataISO(input.dataPagamento);
  } catch {
    throw new BusinessError('Data de pagamento inválida.');
  }

  const valor = num(input.valor);
  if (valor == null || valor <= 0) throw new BusinessError('Valor do pagamento inválido.');

  const fonteRecursoTipo = num(input.fonteRecursoTipo);
  if (fonteRecursoTipo == null || fonteRecursoTipo <= 0)
    throw new BusinessError('Informe a fonte de recurso.');

  const meio = input.meioPagamento;
  if (meio !== 'BANCO' && meio !== 'FUNDO_FIXO')
    throw new BusinessError('Meio de pagamento inválido.');

  let banco: number | null = null;
  let agencia: number | null = null;
  let contaCorrente: string | null = null;
  if (meio === 'BANCO') {
    banco = num(input.banco);
    agencia = num(input.agencia);
    contaCorrente = input.contaCorrente?.trim() || null;
    if (banco == null || agencia == null || !contaCorrente)
      throw new BusinessError('Para pagamento via Banco, informe banco, agência e conta corrente.');
  }

  return {
    ajusteId: input.ajusteId?.trim() || null,
    documentoFiscalId: input.documentoFiscalId?.trim() || null,
    dataPagamento,
    valor,
    fonteRecursoTipo,
    meioPagamento: meio,
    banco,
    agencia,
    contaCorrente,
    numeroTransacao: input.numeroTransacao?.trim() || null,
  };
}

export class PagamentoUseCases {
  constructor(
    private readonly repo: IPagamentoRepository,
    private readonly prestacoes: IPrestacaoRepository,
    /** Para o rateio do pagamento — ver ratearNoOrgao. */
    private readonly documentos?: DocumentoFiscalUseCases,
    private readonly rateios?: IRateioRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirPagamentoNaPrestacao(prestacaoId: string, id: string): Promise<Pagamento> {
    const pg = await this.repo.buscarPorId(id);
    if (!pg || pg.prestacaoId !== prestacaoId) throw new NotFoundError('Pagamento não encontrado.');
    return pg;
  }

  private async validarDoc(prestacaoId: string, dados: DadosPagamento) {
    if (dados.documentoFiscalId && !(await this.repo.docPertenceAPrestacao(prestacaoId, dados.documentoFiscalId)))
      throw new BusinessError('Documento fiscal vinculado não pertence a esta prestação.');
  }

  // ---------------------------------------------------------------------------
  // Escopo do órgão — Execução → Financeiro → Pagamentos
  //
  // O pagamento é lançado quando o dinheiro sai, e não dentro de uma prestação.
  // A prestação depois **escolhe** quais pagamentos do período entram nela.
  // ---------------------------------------------------------------------------

  async listarDoOrgao(): Promise<Pagamento[]> {
    return this.repo.listarDoOrgao();
  }

  async criarNoOrgao(input: PagamentoDTO): Promise<Pagamento> {
    return this.repo.criarNoOrgao(validar(input));
  }

  /**
   * Lança o pagamento de uma nota rateada — **um por ajuste, de uma vez**.
   *
   * A despesa rateada acontece uma vez e é paga por vários ajustes. Antes, quem
   * lançava a nota de R$ 800,00 do material comum tinha de saber de cabeça que
   * 75% eram de um ajuste e 25% de outro, fazer a conta e lançar dois
   * pagamentos — e a segunda parcela, a menor, é a que se esquece. O dinheiro
   * saía inteiro do banco e aparecia pela metade na prestação.
   *
   * Aqui o quadro do rateio faz a conta e os dois lançamentos nascem juntos.
   * Nenhum valor vem do cliente: a base é a própria nota e a proporção é a do
   * rateio, pelos mesmos motivos que o percentual da apropriação também não
   * vem da tela.
   *
   * **A base é o líquido** (bruto − retenções), não o bruto: é o que de fato
   * sai da conta. Ratear o bruto faria a soma dos pagamentos não bater com o
   * extrato — justamente a conferência que a conciliação existe para fazer.
   */
  async ratearNoOrgao(input: RatearPagamentoDTO): Promise<Pagamento[]> {
    if (!this.documentos || !this.rateios)
      throw new BusinessError('Rateio de pagamento indisponível nesta instalação.');

    const documentoFiscalId = String(input.documentoFiscalId ?? '').trim();
    if (!documentoFiscalId) throw new BusinessError('Escolha o documento fiscal.');

    const doc = await this.documentos.garantirDoOrgao(documentoFiscalId);
    if (!doc.rateioProveniente || !doc.rateioId)
      throw new BusinessError('Esta nota não está marcada como proveniente de rateio.');

    const rateio = await this.rateios.buscarPorId(doc.rateioId);
    if (!rateio) throw new BusinessError('O rateio desta nota não foi encontrado.');
    if (!rateio.participantes.length)
      throw new BusinessError(`O rateio "${rateio.titulo}" não tem ajustes no quadro.`);

    const base = arredondarCentavos(doc.valorBruto - doc.valorEncargos);
    if (base <= 0) throw new BusinessError('O valor líquido da nota não é maior que zero.');

    const parcelas = ratearValor(base, rateio.participantes).filter((p) => p.valor > 0);
    if (!parcelas.length)
      throw new BusinessError('O quadro do rateio não produziu nenhuma parcela com valor.');

    /*
     * Um por vez, e não numa transação.
     *
     * A criação passa pelas extensions (carimbo de órgão e trilha), e o
     * repositório expõe a criação unitária. Falha no meio deixa os anteriores
     * gravados — que é o comportamento menos ruim aqui: o usuário vê o que
     * entrou, e relançar o que falta é trivial. Desfazer pagamentos já
     * conciliados seria pior.
     */
    const criados: Pagamento[] = [];
    for (const parcela of parcelas) {
      criados.push(
        await this.repo.criarNoOrgao(
          validar({
            ...input,
            ajusteId: parcela.ajusteId,
            documentoFiscalId,
            valor: parcela.valor,
          }),
        ),
      );
    }
    return criados;
  }

  async atualizarNoOrgao(id: string, input: PagamentoDTO): Promise<Pagamento> {
    await this.garantirDoOrgao(id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluirDoOrgao(id: string): Promise<void> {
    await this.garantirDoOrgao(id);
    await this.repo.excluir(id);
  }

  /**
   * O pagamento existe e é deste órgão?
   *
   * A conferência é a própria busca: a extension de tenant já recorta, então um
   * registro de outro órgão simplesmente "não existe".
   */
  async garantirDoOrgao(id: string): Promise<Pagamento> {
    const pg = await this.repo.buscarPorId(id);
    if (!pg) throw new NotFoundError('Pagamento não encontrado.');
    return pg;
  }


  // ---------------------------------------------------------------------------
  // Apropriação — a prestação escolhe quais lançamentos do órgão entram nela
  // ---------------------------------------------------------------------------

  /** Os candidatos: do ajuste desta prestação, no exercício, ainda livres. */
  async listarCandidatos(prestacaoId: string) {
    const prestacao = await this.prestacoes.buscarPorId(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');
    return this.repo.listarCandidatos(prestacao.ajusteId, prestacao.ano);
  }

  /**
   * Inclui na prestação.
   *
   * Recusa o que já pertence a **outra** prestação: o mesmo dinheiro em duas
   * prestações é o erro que esta tela existe para impedir, e ele não se
   * descobre olhando — some no meio de centenas de linhas.
   */
  async apropriar(prestacaoId: string, id: string) {
    const prestacao = await this.prestacoes.buscarPorId(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');

    const item = await this.repo.buscarPorId(id);
    if (!item) throw new NotFoundError('Lançamento não encontrado.');
    if (item.prestacaoId && item.prestacaoId !== prestacaoId)
      throw new BusinessError('Este lançamento já pertence a outra prestação de contas.');
    if (item.ajusteId && item.ajusteId !== prestacao.ajusteId)
      throw new BusinessError('Este lançamento é de outro ajuste.');

    await this.repo.apropriar(id, prestacaoId, prestacao.ajusteId);
  }

  async desapropriar(prestacaoId: string, id: string) {
    const item = await this.repo.buscarPorId(id);
    if (!item || item.prestacaoId !== prestacaoId)
      throw new NotFoundError('Lançamento não encontrado nesta prestação.');
    await this.repo.desapropriar(id);
  }

  async listar(prestacaoId: string): Promise<Pagamento[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: PagamentoDTO): Promise<Pagamento> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.validarDoc(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: PagamentoDTO): Promise<Pagamento> {
    await this.garantirPagamentoNaPrestacao(prestacaoId, id);
    const dados = validar(input);
    await this.validarDoc(prestacaoId, dados);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirPagamentoNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

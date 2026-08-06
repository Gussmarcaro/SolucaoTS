import type { Pagamento } from '@/core/pagamento/Pagamento';
import type { IPagamentoRepository } from './IPagamentoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosPagamento, PagamentoDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

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

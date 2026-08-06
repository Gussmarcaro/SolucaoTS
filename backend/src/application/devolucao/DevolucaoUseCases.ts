import type { Devolucao } from '@/core/devolucao/Devolucao';
import type { IDevolucaoRepository } from './IDevolucaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosDevolucao, DevolucaoDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function validar(input: DevolucaoDTO): DadosDevolucao {
  let data: Date;
  try {
    data = parseDataISO(input.data);
  } catch {
    throw new BusinessError('Data inválida.');
  }
  const natureza =
    typeof input.naturezaDevolucaoTipo === 'string'
      ? Number(input.naturezaDevolucaoTipo)
      : input.naturezaDevolucaoTipo;
  if (!Number.isInteger(natureza) || natureza <= 0)
    throw new BusinessError('Informe a natureza da devolução.');
  const valor = typeof input.valor === 'string' ? Number(input.valor) : input.valor;
  if (!Number.isFinite(valor) || valor <= 0) throw new BusinessError('Valor da devolução inválido.');
  return { data, naturezaDevolucaoTipo: natureza, valor };
}

export class DevolucaoUseCases {
  constructor(
    private readonly repo: IDevolucaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Devolucao> {
    const d = await this.repo.buscarPorId(id);
    if (!d || d.prestacaoId !== prestacaoId) throw new NotFoundError('Devolução não encontrada.');
    return d;
  }

  async listar(prestacaoId: string): Promise<Devolucao[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: DevolucaoDTO): Promise<Devolucao> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: DevolucaoDTO): Promise<Devolucao> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

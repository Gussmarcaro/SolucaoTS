import type { Desconto } from '@/core/desconto/Desconto';
import type { IDescontoRepository } from './IDescontoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosDesconto, DescontoDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function validar(input: DescontoDTO): DadosDesconto {
  const descricao = input.descricao?.trim() ?? '';
  if (!descricao) throw new BusinessError('Informe a descrição do desconto.');
  let data: Date;
  try {
    data = parseDataISO(input.data);
  } catch {
    throw new BusinessError('Data inválida.');
  }
  const valor = typeof input.valor === 'string' ? Number(input.valor) : input.valor;
  if (!Number.isFinite(valor) || valor <= 0) throw new BusinessError('Valor do desconto inválido.');
  return { data, descricao, valor };
}

export class DescontoUseCases {
  constructor(
    private readonly repo: IDescontoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Desconto> {
    const d = await this.repo.buscarPorId(id);
    if (!d || d.prestacaoId !== prestacaoId) throw new NotFoundError('Desconto não encontrado.');
    return d;
  }

  async listar(prestacaoId: string): Promise<Desconto[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: DescontoDTO): Promise<Desconto> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: DescontoDTO): Promise<Desconto> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

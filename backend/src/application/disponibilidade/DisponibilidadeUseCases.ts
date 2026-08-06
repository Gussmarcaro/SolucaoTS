import type { Disponibilidade } from '@/core/disponibilidade/Disponibilidade';
import type { IDisponibilidadeRepository } from './IDisponibilidadeRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosDisponibilidade, DisponibilidadeDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

function inteiroPos(v: unknown, campo: string): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isInteger(n) || n <= 0) throw new BusinessError(`${campo} inválido.`);
  return n;
}

function decimal(v: unknown, campo: string): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isFinite(n)) throw new BusinessError(`${campo} inválido.`);
  return n;
}

function validar(input: DisponibilidadeDTO): DadosDisponibilidade {
  const conta = input.conta?.trim() ?? '';
  if (!conta) throw new BusinessError('Informe a conta.');
  return {
    banco: inteiroPos(input.banco, 'Banco'),
    agencia: inteiroPos(input.agencia, 'Agência'),
    conta,
    contaTipo: inteiroPos(input.contaTipo, 'Tipo de conta'),
    saldoBancario: decimal(input.saldoBancario, 'Saldo bancário'),
    saldoContabil: decimal(input.saldoContabil, 'Saldo contábil'),
  };
}

export class DisponibilidadeUseCases {
  constructor(
    private readonly repo: IDisponibilidadeRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Disponibilidade> {
    const d = await this.repo.buscarPorId(id);
    if (!d || d.prestacaoId !== prestacaoId) throw new NotFoundError('Disponibilidade não encontrada.');
    return d;
  }

  async listar(prestacaoId: string): Promise<Disponibilidade[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: DisponibilidadeDTO): Promise<Disponibilidade> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: DisponibilidadeDTO): Promise<Disponibilidade> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

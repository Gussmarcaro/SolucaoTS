import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDisponibilidadeRepository } from '@/application/disponibilidade/IDisponibilidadeRepository';
import type { DadosDisponibilidade } from '@/application/disponibilidade/dtos';
import type { Disponibilidade } from '@/core/disponibilidade/Disponibilidade';

const selecao = {
  id: true,
  prestacaoId: true,
  banco: true,
  agencia: true,
  conta: true,
  contaTipo: true,
  saldoBancario: true,
  saldoContabil: true,
} satisfies Prisma.DisponibilidadeSelect;

type Row = Prisma.DisponibilidadeGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Disponibilidade {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
    contaTipo: row.contaTipo,
    saldoBancario: Number(row.saldoBancario),
    saldoContabil: Number(row.saldoContabil),
  };
}

export class PrismaDisponibilidadeRepository implements IDisponibilidadeRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Disponibilidade[]> {
    const rows = await prisma.disponibilidade.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ banco: 'asc' }, { agencia: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Disponibilidade | null> {
    const row = await prisma.disponibilidade.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosDisponibilidade): Promise<Disponibilidade> {
    const row = await prisma.disponibilidade.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDisponibilidade): Promise<Disponibilidade> {
    const row = await prisma.disponibilidade.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.disponibilidade.delete({ where: { id } });
  }

  async obterSaldoFundoFixo(prestacaoId: string): Promise<number> {
    const row = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: { saldoFundoFixo: true },
    });
    return Number(row?.saldoFundoFixo ?? 0);
  }

  async definirSaldoFundoFixo(prestacaoId: string, valor: number): Promise<number> {
    const row = await prisma.prestacaoContas.update({
      where: { id: prestacaoId },
      data: { saldoFundoFixo: valor },
      select: { saldoFundoFixo: true },
    });
    return Number(row.saldoFundoFixo);
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDescontoRepository } from '@/application/desconto/IDescontoRepository';
import type { DadosDesconto } from '@/application/desconto/dtos';
import type { Desconto } from '@/core/desconto/Desconto';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  data: true,
  descricao: true,
  valor: true,
} satisfies Prisma.DescontoSelect;

type Row = Prisma.DescontoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Desconto {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    data: paraDataISO(row.data),
    descricao: row.descricao,
    valor: Number(row.valor),
  };
}

export class PrismaDescontoRepository implements IDescontoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Desconto[]> {
    const rows = await prisma.desconto.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { data: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Desconto | null> {
    const row = await prisma.desconto.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosDesconto): Promise<Desconto> {
    const row = await prisma.desconto.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDesconto): Promise<Desconto> {
    const row = await prisma.desconto.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.desconto.delete({ where: { id } });
  }
}

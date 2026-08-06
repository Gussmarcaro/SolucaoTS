import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDevolucaoRepository } from '@/application/devolucao/IDevolucaoRepository';
import type { DadosDevolucao } from '@/application/devolucao/dtos';
import type { Devolucao } from '@/core/devolucao/Devolucao';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  data: true,
  naturezaDevolucaoTipo: true,
  valor: true,
} satisfies Prisma.DevolucaoSelect;

type Row = Prisma.DevolucaoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Devolucao {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    data: paraDataISO(row.data),
    naturezaDevolucaoTipo: row.naturezaDevolucaoTipo,
    valor: Number(row.valor),
  };
}

export class PrismaDevolucaoRepository implements IDevolucaoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Devolucao[]> {
    const rows = await prisma.devolucao.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { data: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Devolucao | null> {
    const row = await prisma.devolucao.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosDevolucao): Promise<Devolucao> {
    const row = await prisma.devolucao.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDevolucao): Promise<Devolucao> {
    const row = await prisma.devolucao.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.devolucao.delete({ where: { id } });
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IBemPrestacaoRepository } from '@/application/bemPrestacao/IBemPrestacaoRepository';
import type { DadosBemPrestacao } from '@/application/bemPrestacao/dtos';
import type { BemPrestacao, CategoriaBem } from '@/core/bemPrestacao/BemPrestacao';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  categoria: true,
  numeroPatrimonio: true,
  descricao: true,
  data: true,
  valor: true,
} satisfies Prisma.BemPrestacaoSelect;

type Row = Prisma.BemPrestacaoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): BemPrestacao {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    categoria: row.categoria as CategoriaBem,
    numeroPatrimonio: row.numeroPatrimonio,
    descricao: row.descricao,
    data: paraDataISO(row.data),
    valor: row.valor == null ? null : Number(row.valor),
  };
}

export class PrismaBemPrestacaoRepository implements IBemPrestacaoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<BemPrestacao[]> {
    const rows = await prisma.bemPrestacao.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ categoria: 'asc' }, { data: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<BemPrestacao | null> {
    const row = await prisma.bemPrestacao.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosBemPrestacao): Promise<BemPrestacao> {
    const row = await prisma.bemPrestacao.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosBemPrestacao): Promise<BemPrestacao> {
    const row = await prisma.bemPrestacao.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.bemPrestacao.delete({ where: { id } });
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IPlanoAplicacaoRepository } from '@/application/planoAplicacao/IPlanoAplicacaoRepository';
import type { DadosPlanoItem } from '@/application/planoAplicacao/dtos';
import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';

const selecao = {
  id: true,
  ajusteId: true,
  categoria: true,
  subcategoria: true,
  ano: true,
  mes: true,
  valor: true,
  descricao: true,
} satisfies Prisma.PlanoAplicacaoItemSelect;

type Row = Prisma.PlanoAplicacaoItemGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): PlanoAplicacaoItem {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    categoria: row.categoria,
    subcategoria: row.subcategoria,
    ano: row.ano,
    mes: row.mes,
    valor: Number(row.valor),
    descricao: row.descricao,
  };
}

const ordem: Prisma.PlanoAplicacaoItemOrderByWithRelationInput[] = [
  { categoria: 'asc' },
  { subcategoria: 'asc' },
  { ano: 'asc' },
  { mes: 'asc' },
];

export class PrismaPlanoAplicacaoRepository implements IPlanoAplicacaoRepository {
  async listarPorAjuste(ajusteId: string): Promise<PlanoAplicacaoItem[]> {
    const rows = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: ordem,
    });
    return rows.map(toDomain);
  }

  async substituir(ajusteId: string, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]> {
    return prisma.$transaction(async (tx) => {
      await tx.planoAplicacaoItem.deleteMany({ where: { ajusteId } });
      if (itens.length) {
        await tx.planoAplicacaoItem.createMany({
          data: itens.map((i) => ({ ajusteId, ...i })),
        });
      }
      const rows = await tx.planoAplicacaoItem.findMany({
        where: { ajusteId },
        select: selecao,
        orderBy: ordem,
      });
      return rows.map(toDomain);
    });
  }
}

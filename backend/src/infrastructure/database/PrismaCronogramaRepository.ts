import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ICronogramaRepository } from '@/application/cronograma/ICronogramaRepository';
import type { DadosCronogramaItem } from '@/application/cronograma/dtos';
import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';

const selecao = {
  id: true,
  ajusteId: true,
  ano: true,
  mes: true,
  valor: true,
} satisfies Prisma.CronogramaDesembolsoItemSelect;

type Row = Prisma.CronogramaDesembolsoItemGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): CronogramaItem {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    ano: row.ano,
    mes: row.mes,
    valor: Number(row.valor),
  };
}

const ordem: Prisma.CronogramaDesembolsoItemOrderByWithRelationInput[] = [
  { ano: 'asc' },
  { mes: 'asc' },
];

export class PrismaCronogramaRepository implements ICronogramaRepository {
  async listarPorAjuste(ajusteId: string): Promise<CronogramaItem[]> {
    const rows = await prisma.cronogramaDesembolsoItem.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: ordem,
    });
    return rows.map(toDomain);
  }

  async substituir(ajusteId: string, itens: DadosCronogramaItem[]): Promise<CronogramaItem[]> {
    return prisma.$transaction(async (tx) => {
      await tx.cronogramaDesembolsoItem.deleteMany({ where: { ajusteId } });
      if (itens.length) {
        await tx.cronogramaDesembolsoItem.createMany({
          data: itens.map((i) => ({ ajusteId, ...i })),
        });
      }
      const rows = await tx.cronogramaDesembolsoItem.findMany({
        where: { ajusteId },
        select: selecao,
        orderBy: ordem,
      });
      return rows.map(toDomain);
    });
  }
}

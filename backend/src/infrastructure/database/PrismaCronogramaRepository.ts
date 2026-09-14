import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ICronogramaRepository } from '@/application/cronograma/ICronogramaRepository';
import type { DadosCronogramaItem } from '@/application/cronograma/dtos';
import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';

const selecao = {
  id: true,
  ajusteId: true,
  categoria: true,
  subcategoria: true,
  ano: true,
  mes: true,
  valor: true,
} satisfies Prisma.CronogramaDesembolsoItemSelect;

type Row = Prisma.CronogramaDesembolsoItemGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): CronogramaItem {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    categoria: row.categoria,
    subcategoria: row.subcategoria,
    ano: row.ano,
    mes: row.mes,
    valor: Number(row.valor),
  };
}

const ordem: Prisma.CronogramaDesembolsoItemOrderByWithRelationInput[] = [
  { categoria: 'asc' },
  { subcategoria: 'asc' },
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

  /**
   * Substitui só o exercício, preservando os demais.
   *
   * Numa transação, como a substituição total: apagar e recriar em duas idas
   * deixaria uma janela em que o exercício está vazio — e é a janela em que
   * alguém abre a tela e conclui que perdeu o trabalho.
   */
  async substituirAno(ajusteId: string, ano: number, itens: DadosCronogramaItem[]) {
    return prisma.$transaction(async (tx) => {
      await tx.cronogramaDesembolsoItem.deleteMany({ where: { ajusteId, ano } });
      if (itens.length) {
        await tx.cronogramaDesembolsoItem.createMany({ data: itens.map((i) => ({ ajusteId, ...i })) });
      }
      const rows = await tx.cronogramaDesembolsoItem.findMany({ where: { ajusteId }, select: selecao, orderBy: ordem });
      return rows.map(toDomain);
    });
  }

  async exercicios(ajusteId: string): Promise<number[]> {
    const linhas = await prisma.cronogramaDesembolsoItem.findMany({
      where: { ajusteId },
      select: { ano: true },
      distinct: ['ano'],
      orderBy: { ano: 'desc' },
    });
    return linhas.map((l) => l.ano);
  }
}

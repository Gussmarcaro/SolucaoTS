import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ITermoAditivoRepository } from '@/application/termoAditivo/ITermoAditivoRepository';
import type { DadosTermoAditivo } from '@/application/termoAditivo/dtos';
import type { TermoAditivo } from '@/core/termoAditivo/TermoAditivo';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  ajusteId: true,
  numero: true,
  dataAssinatura: true,
  valorAcrescido: true,
  valorSuprimido: true,
} satisfies Prisma.TermoAditivoSelect;

type Row = Prisma.TermoAditivoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): TermoAditivo {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    numero: row.numero,
    dataAssinatura: paraDataISO(row.dataAssinatura),
    valorAcrescido: row.valorAcrescido == null ? null : Number(row.valorAcrescido),
    valorSuprimido: row.valorSuprimido == null ? null : Number(row.valorSuprimido),
  };
}

export class PrismaTermoAditivoRepository implements ITermoAditivoRepository {
  async listarPorAjuste(ajusteId: string): Promise<TermoAditivo[]> {
    const rows = await prisma.termoAditivo.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: { dataAssinatura: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<TermoAditivo | null> {
    const row = await prisma.termoAditivo.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(ajusteId: string, dados: DadosTermoAditivo): Promise<TermoAditivo> {
    const row = await prisma.termoAditivo.create({ data: { ajusteId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosTermoAditivo): Promise<TermoAditivo> {
    const row = await prisma.termoAditivo.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.termoAditivo.delete({ where: { id } });
  }
}

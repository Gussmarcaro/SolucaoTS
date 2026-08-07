import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IRepasseRepository } from '@/application/repasse/IRepasseRepository';
import type { DadosRepasse } from '@/application/repasse/dtos';
import type { Repasse } from '@/core/repasse/Repasse';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  empenhoId: true,
  dataPrevista: true,
  dataRepasse: true,
  valorPrevisto: true,
  valorRepasse: true,
  justificativaDiferenca: true,
  tipoDocumentoBancario: true,
  descricaoOutros: true,
  numeroDocumento: true,
  banco: true,
  agencia: true,
  conta: true,
  empenho: { select: { numero: true } },
} satisfies Prisma.RepassePrestacaoSelect;

type Row = Prisma.RepassePrestacaoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Repasse {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    empenhoId: row.empenhoId,
    empenhoNumero: row.empenho?.numero ?? null,
    dataPrevista: paraDataISO(row.dataPrevista),
    dataRepasse: paraDataISO(row.dataRepasse),
    valorPrevisto: Number(row.valorPrevisto),
    valorRepasse: Number(row.valorRepasse),
    justificativaDiferenca: row.justificativaDiferenca,
    tipoDocumentoBancario: row.tipoDocumentoBancario,
    descricaoOutros: row.descricaoOutros,
    numeroDocumento: row.numeroDocumento,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
  };
}

export class PrismaRepasseRepository implements IRepasseRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Repasse[]> {
    const rows = await prisma.repassePrestacao.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { dataRepasse: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Repasse | null> {
    const row = await prisma.repassePrestacao.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async somaRepassesEmpenho(empenhoId: string, ignorarId?: string): Promise<number> {
    const r = await prisma.repassePrestacao.aggregate({
      where: { empenhoId, id: ignorarId ? { not: ignorarId } : undefined },
      _sum: { valorRepasse: true },
    });
    return r._sum.valorRepasse ? Number(r._sum.valorRepasse) : 0;
  }

  async criar(prestacaoId: string, dados: DadosRepasse): Promise<Repasse> {
    const row = await prisma.repassePrestacao.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosRepasse): Promise<Repasse> {
    const row = await prisma.repassePrestacao.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.repassePrestacao.delete({ where: { id } });
  }
}

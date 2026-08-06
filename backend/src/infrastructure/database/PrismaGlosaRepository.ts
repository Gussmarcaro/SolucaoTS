import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IGlosaRepository } from '@/application/glosa/IGlosaRepository';
import type { DadosGlosa } from '@/application/glosa/dtos';
import type { Glosa, ResultadoAnalise } from '@/core/glosa/Glosa';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  documentoFiscalId: true,
  pagamentoData: true,
  resultadoAnalise: true,
  valorGlosa: true,
  documentoFiscal: { select: { numero: true } },
} satisfies Prisma.GlosaSelect;

type Row = Prisma.GlosaGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Glosa {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    documentoFiscalId: row.documentoFiscalId,
    documentoNumero: row.documentoFiscal?.numero ?? null,
    pagamentoData: row.pagamentoData ? paraDataISO(row.pagamentoData) : null,
    resultadoAnalise: row.resultadoAnalise as ResultadoAnalise,
    valorGlosa: row.valorGlosa == null ? null : Number(row.valorGlosa),
  };
}

export class PrismaGlosaRepository implements IGlosaRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Glosa[]> {
    const rows = await prisma.glosa.findMany({ where: { prestacaoId }, select: selecao });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Glosa | null> {
    const row = await prisma.glosa.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean> {
    const d = await prisma.documentoFiscal.findFirst({
      where: { id: documentoFiscalId, prestacaoId },
      select: { id: true },
    });
    return !!d;
  }

  async criar(prestacaoId: string, dados: DadosGlosa): Promise<Glosa> {
    const row = await prisma.glosa.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosGlosa): Promise<Glosa> {
    const row = await prisma.glosa.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.glosa.delete({ where: { id } });
  }
}

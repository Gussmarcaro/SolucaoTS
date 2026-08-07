import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IRelatorioAtividadeRepository } from '@/application/relatorioAtividade/IRelatorioAtividadeRepository';
import type { DadosAfericaoMeta } from '@/application/relatorioAtividade/dtos';
import type { AfericaoMeta, ResultadoMeta } from '@/core/relatorioAtividade/AfericaoMeta';

const selecao = {
  id: true,
  prestacaoId: true,
  nomePrograma: true,
  codigoMeta: true,
  periodo: true,
  quantidadeRealizada: true,
  resultadoMeta: true,
  justificativaPeriodo: true,
  metaAtendida: true,
  justificativaMeta: true,
} satisfies Prisma.RelatorioAtividadeMetaSelect;

type Row = Prisma.RelatorioAtividadeMetaGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): AfericaoMeta {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    nomePrograma: row.nomePrograma,
    codigoMeta: row.codigoMeta,
    periodo: row.periodo,
    quantidadeRealizada: row.quantidadeRealizada == null ? null : Number(row.quantidadeRealizada),
    resultadoMeta: (row.resultadoMeta as ResultadoMeta | null) ?? null,
    justificativaPeriodo: row.justificativaPeriodo,
    metaAtendida: row.metaAtendida,
    justificativaMeta: row.justificativaMeta,
  };
}

export class PrismaRelatorioAtividadeRepository implements IRelatorioAtividadeRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<AfericaoMeta[]> {
    const rows = await prisma.relatorioAtividadeMeta.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ nomePrograma: 'asc' }, { codigoMeta: 'asc' }, { periodo: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<AfericaoMeta | null> {
    const row = await prisma.relatorioAtividadeMeta.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(
    prestacaoId: string,
    nomePrograma: string,
    codigoMeta: string,
    periodo: number,
  ): Promise<AfericaoMeta | null> {
    const row = await prisma.relatorioAtividadeMeta.findFirst({
      where: { prestacaoId, nomePrograma, codigoMeta, periodo },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosAfericaoMeta): Promise<AfericaoMeta> {
    const row = await prisma.relatorioAtividadeMeta.create({
      data: { prestacaoId, ...dados },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosAfericaoMeta): Promise<AfericaoMeta> {
    const row = await prisma.relatorioAtividadeMeta.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.relatorioAtividadeMeta.delete({ where: { id } });
  }
}

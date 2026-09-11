import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IProgramaRepository } from '@/application/programa/IProgramaRepository';
import type { DadosMeta } from '@/application/programa/dtos';
import type { Meta, Programa } from '@/core/programa/Programa';

const programaSelect = {
  id: true,
  ajusteId: true,
  nome: true,
  metas: {
    select: { id: true, programaId: true, codigoMeta: true, descricao: true, quantificavel: true, quantidadePrevista: true, unidadeMedida: true },
    orderBy: { codigoMeta: 'asc' },
  },
} satisfies Prisma.ProgramaSelect;

type ProgramaRow = Prisma.ProgramaGetPayload<{ select: typeof programaSelect }>;

/**
 * Uma meta do banco para o domínio.
 *
 * Extraído porque o mapeamento estava repetido em três lugares — e foi
 * exatamente por isso que o campo novo precisou ser lembrado três vezes.
 */
function metaToDomain(m: {
  id: string;
  programaId: string;
  codigoMeta: string;
  descricao: string | null;
  quantificavel: boolean;
  quantidadePrevista: Prisma.Decimal | null;
  unidadeMedida: string | null;
}): Meta {
  return {
    id: m.id,
    programaId: m.programaId,
    codigoMeta: m.codigoMeta,
    descricao: m.descricao,
    quantificavel: m.quantificavel,
    quantidadePrevista: m.quantidadePrevista == null ? null : Number(m.quantidadePrevista),
    unidadeMedida: m.unidadeMedida,
  };
}

function programaToDomain(row: ProgramaRow): Programa {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    nome: row.nome,
    metas: row.metas.map(metaToDomain),
  };
}

export class PrismaProgramaRepository implements IProgramaRepository {
  async listarPorAjuste(ajusteId: string): Promise<Programa[]> {
    const rows = await prisma.programa.findMany({
      where: { ajusteId },
      select: programaSelect,
      orderBy: { nome: 'asc' },
    });
    return rows.map(programaToDomain);
  }

  async programaDoAjuste(ajusteId: string, programaId: string): Promise<boolean> {
    const p = await prisma.programa.findFirst({ where: { id: programaId, ajusteId }, select: { id: true } });
    return !!p;
  }

  async nomeExiste(ajusteId: string, nome: string, ignorarId?: string): Promise<boolean> {
    const p = await prisma.programa.findFirst({
      where: { ajusteId, nome, id: ignorarId ? { not: ignorarId } : undefined },
      select: { id: true },
    });
    return !!p;
  }

  async criarPrograma(ajusteId: string, nome: string): Promise<Programa> {
    const row = await prisma.programa.create({ data: { ajusteId, nome }, select: programaSelect });
    return programaToDomain(row);
  }

  async atualizarPrograma(id: string, nome: string): Promise<Programa> {
    const row = await prisma.programa.update({ where: { id }, data: { nome }, select: programaSelect });
    return programaToDomain(row);
  }

  async excluirPrograma(id: string): Promise<void> {
    await prisma.$transaction([
      prisma.meta.deleteMany({ where: { programaId: id } }),
      prisma.programa.delete({ where: { id } }),
    ]);
  }

  async metaDoPrograma(programaId: string, metaId: string): Promise<boolean> {
    const m = await prisma.meta.findFirst({ where: { id: metaId, programaId }, select: { id: true } });
    return !!m;
  }

  async codigoExiste(programaId: string, codigoMeta: string, ignorarId?: string): Promise<boolean> {
    const m = await prisma.meta.findFirst({
      where: { programaId, codigoMeta, id: ignorarId ? { not: ignorarId } : undefined },
      select: { id: true },
    });
    return !!m;
  }

  async criarMeta(programaId: string, dados: DadosMeta): Promise<Meta> {
    const m = await prisma.meta.create({ data: { programaId, ...dados } });
    return metaToDomain(m);
  }

  async atualizarMeta(id: string, dados: DadosMeta): Promise<Meta> {
    const m = await prisma.meta.update({ where: { id }, data: dados });
    return metaToDomain(m);
  }

  async excluirMeta(id: string): Promise<void> {
    await prisma.meta.delete({ where: { id } });
  }
}

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
    select: { id: true, programaId: true, codigoMeta: true, descricao: true, quantificavel: true },
    orderBy: { codigoMeta: 'asc' },
  },
} satisfies Prisma.ProgramaSelect;

type ProgramaRow = Prisma.ProgramaGetPayload<{ select: typeof programaSelect }>;

function programaToDomain(row: ProgramaRow): Programa {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    nome: row.nome,
    metas: row.metas.map((m) => ({
      id: m.id,
      programaId: m.programaId,
      codigoMeta: m.codigoMeta,
      descricao: m.descricao,
      quantificavel: m.quantificavel,
    })),
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
    return { id: m.id, programaId: m.programaId, codigoMeta: m.codigoMeta, descricao: m.descricao, quantificavel: m.quantificavel };
  }

  async atualizarMeta(id: string, dados: DadosMeta): Promise<Meta> {
    const m = await prisma.meta.update({ where: { id }, data: dados });
    return { id: m.id, programaId: m.programaId, codigoMeta: m.codigoMeta, descricao: m.descricao, quantificavel: m.quantificavel };
  }

  async excluirMeta(id: string): Promise<void> {
    await prisma.meta.delete({ where: { id } });
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IProgramaRepository } from '@/application/programa/IProgramaRepository';
import type { DadosMeta } from '@/application/programa/dtos';
import type { Meta, Programa } from '@/core/programa/Programa';
import { ehQuantificavel, type PeriodicidadeMeta, type TipoMeta } from '@/core/meta/Meta';
import { paraDataISO } from '@/shared/datas';

const metaSelect = {
  id: true,
  programaId: true,
  codigoMeta: true,
  nome: true,
  descricao: true,
  tipo: true,
  unidadeMedida: true,
  periodicidade: true,
  vigenciaInicio: true,
  vigenciaFim: true,
  periodicidades: {
    select: { id: true, ano: true, periodo: true, qualificador: true, quantidade: true },
    orderBy: [{ ano: 'asc' }, { periodo: 'asc' }],
  },
} satisfies Prisma.MetaSelect;

type MetaRow = Prisma.MetaGetPayload<{ select: typeof metaSelect }>;

const programaSelect = {
  id: true,
  ajusteId: true,
  nome: true,
  metas: { select: metaSelect, orderBy: { codigoMeta: 'asc' } },
} satisfies Prisma.ProgramaSelect;

type ProgramaRow = Prisma.ProgramaGetPayload<{ select: typeof programaSelect }>;

/**
 * Uma meta do banco para o domínio.
 *
 * Extraído porque o mapeamento estava repetido em três lugares — e foi
 * exatamente por isso que o campo novo precisou ser lembrado três vezes.
 *
 * `quantificavel` é **derivado** aqui, e não lido de coluna: é o que garante
 * que ele nunca discorde do tipo.
 */
function metaToDomain(m: MetaRow): Meta {
  const tipo = m.tipo as TipoMeta;
  return {
    id: m.id,
    programaId: m.programaId,
    codigoMeta: m.codigoMeta,
    nome: m.nome,
    descricao: m.descricao,
    tipo,
    quantificavel: ehQuantificavel(tipo),
    unidadeMedida: m.unidadeMedida,
    periodicidade: m.periodicidade as PeriodicidadeMeta,
    vigenciaInicio: m.vigenciaInicio ? paraDataISO(m.vigenciaInicio) : null,
    vigenciaFim: m.vigenciaFim ? paraDataISO(m.vigenciaFim) : null,
    periodicidades: m.periodicidades.map((p) => ({
      id: p.id,
      ano: p.ano,
      periodo: p.periodo,
      qualificador: p.qualificador,
      quantidade: Number(p.quantidade),
    })),
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

/** Os campos da própria meta, sem o quadro de períodos. */
const camposDaMeta = (d: DadosMeta) => ({
  codigoMeta: d.codigoMeta,
  nome: d.nome,
  descricao: d.descricao,
  tipo: d.tipo,
  unidadeMedida: d.unidadeMedida,
  periodicidade: d.periodicidade,
  vigenciaInicio: d.vigenciaInicio,
  vigenciaFim: d.vigenciaFim,
});

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
    const m = await prisma.meta.create({
      data: {
        programaId,
        ...camposDaMeta(dados),
        periodicidades: { create: dados.periodicidades },
      },
      select: metaSelect,
    });
    return metaToDomain(m);
  }

  /**
   * O quadro de períodos é **substituído por inteiro**.
   *
   * Calcular o diff daria uma trilha de auditoria mais fina, mas trocaria uma
   * operação previsível por três — é a mesma escolha dos vínculos da agenda.
   * A transação existe para não haver instante em que a meta esteja sem quadro:
   * a tela do Plano de Metas leria uma meta com zero períodos e a mostraria
   * como se nada tivesse sido pactuado.
   */
  async atualizarMeta(id: string, dados: DadosMeta): Promise<Meta> {
    const [, , m] = await prisma.$transaction([
      prisma.metaPeriodicidade.deleteMany({ where: { metaId: id } }),
      prisma.metaPeriodicidade.createMany({
        data: dados.periodicidades.map((p) => ({ ...p, metaId: id })),
      }),
      prisma.meta.update({ where: { id }, data: camposDaMeta(dados), select: metaSelect }),
    ]);
    return metaToDomain(m);
  }

  async excluirMeta(id: string): Promise<void> {
    await prisma.meta.delete({ where: { id } });
  }
}

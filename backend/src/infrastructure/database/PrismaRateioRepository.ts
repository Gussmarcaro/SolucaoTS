import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { buscaRateio } from './buscaTexto';
import type {
  IRateioRepository,
  ListarRateiosParams,
  PaginaRateios,
} from '@/application/rateio/IRateioRepository';
import type { DadosRateio } from '@/application/rateio/dtos';
import type { Rateio } from '@/core/rateio/Rateio';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  titulo: true,
  vigenciaInicio: true,
  vigenciaFim: true,
  metodo: true,
  descricaoMetodo: true,
  observacoes: true,
  ativo: true,
  criadoPor: true,
  criadoEm: true,
  atualizadoEm: true,
  participantes: {
    select: {
      id: true,
      rateioId: true,
      ajusteId: true,
      base: true,
      ajuste: {
        select: {
          codigoAjuste: true,
          objeto: true,
          entidadeBeneficiaria: { select: { razaoSocial: true } },
        },
      },
    },
    orderBy: { ajuste: { codigoAjuste: 'asc' } },
  },
} satisfies Prisma.RateioSelect;

type Row = Prisma.RateioGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Rateio {
  return {
    id: row.id,
    titulo: row.titulo,
    vigenciaInicio: paraDataISO(row.vigenciaInicio),
    vigenciaFim: paraDataISO(row.vigenciaFim),
    metodo: row.metodo,
    descricaoMetodo: row.descricaoMetodo,
    observacoes: row.observacoes,
    ativo: row.ativo,
    participantes: row.participantes.map((p) => ({
      id: p.id,
      rateioId: p.rateioId,
      ajusteId: p.ajusteId,
      ajusteCodigo: p.ajuste.codigoAjuste,
      ajusteObjeto: p.ajuste.objeto,
      entidadeNome: p.ajuste.entidadeBeneficiaria.razaoSocial,
      base: Number(p.base),
    })),
    criadoPor: row.criadoPor,
    criadoEm: row.criadoEm.toISOString(),
    atualizadoEm: row.atualizadoEm.toISOString(),
  };
}

/** Só os campos do próprio rateio — os participantes são escritos à parte. */
const camposDoRateio = (d: DadosRateio) => ({
  titulo: d.titulo,
  vigenciaInicio: d.vigenciaInicio,
  vigenciaFim: d.vigenciaFim,
  metodo: d.metodo,
  descricaoMetodo: d.descricaoMetodo,
  observacoes: d.observacoes,
  buscaTexto: buscaRateio(d),
});

export class PrismaRateioRepository implements IRateioRepository {
  async listar({ filtros, orderBy, orderDir, page, pageSize }: ListarRateiosParams): Promise<PaginaRateios> {
    const where: Prisma.RateioWhereInput = {
      metodo: filtros.metodo,
      ativo: filtros.ativo,
      // Vigente na data = o período cobre aquele dia.
      ...(filtros.vigenteEm
        ? { vigenciaInicio: { lte: filtros.vigenteEm }, vigenciaFim: { gte: filtros.vigenteEm } }
        : {}),
      ...(filtros.busca ? { buscaTexto: { contains: filtros.busca, mode: 'insensitive' } } : {}),
    };

    const campo = ['titulo', 'vigenciaInicio', 'vigenciaFim', 'metodo', 'criadoEm'].includes(orderBy ?? '')
      ? (orderBy as string)
      : 'vigenciaInicio';

    const [data, total] = await Promise.all([
      prisma.rateio.findMany({
        where,
        select: selecao,
        orderBy: { [campo]: orderDir ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.rateio.count({ where }),
    ]);

    return { data: data.map(toDomain), total };
  }

  async buscarPorId(id: string): Promise<Rateio | null> {
    const row = await prisma.rateio.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(d: DadosRateio): Promise<Rateio> {
    const row = await prisma.rateio.create({
      data: {
        ...camposDoRateio(d),
        participantes: { create: d.participantes },
      },
      select: selecao,
    });
    return toDomain(row);
  }

  /**
   * Substitui os participantes por inteiro, como nos demais blocos com filhos.
   *
   * Calcular o diff daria uma trilha de auditoria mais fina, mas trocaria uma
   * operação previsível por três — e o quadro é pequeno.
   */
  async atualizar(id: string, d: DadosRateio): Promise<Rateio> {
    const [, row] = await prisma.$transaction([
      prisma.rateioParticipante.deleteMany({ where: { rateioId: id } }),
      prisma.rateio.update({
        where: { id },
        data: {
          ...camposDoRateio(d),
          participantes: { create: d.participantes },
        },
        select: selecao,
      }),
    ]);
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Rateio> {
    const row = await prisma.rateio.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.rateio.delete({ where: { id } });
  }

  async ajustesExistentes(ids: string[]): Promise<string[]> {
    const rows = await prisma.ajuste.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /**
   * Ajustes vigentes na data — o carregamento automático do quadro.
   *
   * Vigência em aberto (sem data final) conta como vigente: o ajuste está valendo
   * até que alguém encerre. Já o recorte por órgão não é feito aqui — a extension
   * de tenant filtra `Ajuste` na consulta.
   */
  async ajustesVigentes(em: Date): Promise<{ id: string }[]> {
    return prisma.ajuste.findMany({
      where: {
        AND: [
          { OR: [{ vigenciaInicial: null }, { vigenciaInicial: { lte: em } }] },
          { OR: [{ vigenciaFinal: null }, { vigenciaFinal: { gte: em } }] },
        ],
      },
      select: { id: true },
      orderBy: { codigoAjuste: 'asc' },
    });
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ITarefaRepository } from '@/application/tarefa/ITarefaRepository';
import type { DadosTarefa, ListarTarefasParams, Paginado } from '@/application/tarefa/dtos';
import type { ResumoTarefas, Tarefa } from '@/core/tarefa/Tarefa';
import { STATUS_ABERTOS } from '@/core/tarefa/Tarefa';
import { paraDataISO } from '@/shared/datas';
import { normalizarTexto } from '@/shared/normalizar';

const selecao = {
  id: true,
  titulo: true,
  descricao: true,
  prioridade: true,
  status: true,
  prazoLegal: true,
  ajusteId: true,
  compromissoId: true,
  responsavelId: true,
  origemAlerta: true,
  concluidaEm: true,
  criadoPor: true,
  criadoEm: true,
  atualizadoEm: true,
  // Denormalização de leitura: sem isto a grade faria uma consulta por linha
  // só para mostrar de que ajuste a tarefa trata.
  ajuste: {
    select: {
      codigoAjuste: true,
      entidadeBeneficiaria: { select: { razaoSocial: true } },
    },
  },
  responsavel: { select: { nome: true } },
} satisfies Prisma.TarefaSelect;

type Row = Prisma.TarefaGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Tarefa {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    prioridade: row.prioridade,
    status: row.status,
    prazoLegal: paraDataISO(row.prazoLegal),
    ajusteId: row.ajusteId,
    compromissoId: row.compromissoId,
    ajusteCodigo: row.ajuste?.codigoAjuste ?? null,
    entidadeNome: row.ajuste?.entidadeBeneficiaria?.razaoSocial ?? null,
    responsavelId: row.responsavelId,
    responsavelNome: row.responsavel?.nome ?? null,
    origemAlerta: row.origemAlerta,
    concluidaEm: row.concluidaEm,
    criadoPor: row.criadoPor,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaTarefaRepository implements ITarefaRepository {
  async buscarPorId(id: string): Promise<Tarefa | null> {
    const row = await prisma.tarefa.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  /**
   * Tarefa viva nascida deste alerta.
   *
   * CANCELADA fica de fora de propósito: quem cancelou decidiu que aquela
   * providência não seria tomada daquele jeito, e o alerta continua de pé —
   * pedir a tarefa de novo tem de criar uma nova, não ressuscitar a descartada.
   */
  async buscarPorOrigemAlerta(origemAlerta: string): Promise<Tarefa | null> {
    const row = await prisma.tarefa.findFirst({
      where: { origemAlerta, status: { not: 'CANCELADA' } },
      select: selecao,
      orderBy: { criadoEm: 'desc' },
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosTarefa): Promise<Tarefa> {
    const row = await prisma.tarefa.create({ data: dados, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosTarefa): Promise<Tarefa> {
    const row = await prisma.tarefa.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.tarefa.delete({ where: { id } });
  }

  async ajusteExiste(ajusteId: string): Promise<boolean> {
    return (await prisma.ajuste.count({ where: { id: ajusteId } })) > 0;
  }

  async usuarioExiste(usuarioId: string): Promise<boolean> {
    return (await prisma.usuario.count({ where: { id: usuarioId } })) > 0;
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarTarefasParams): Promise<Paginado<Tarefa>> {
    const where: Prisma.TarefaWhereInput = {
      status: filtros.status ?? (filtros.abertas ? { in: STATUS_ABERTOS } : undefined),
      prioridade: filtros.prioridade,
      ajusteId: filtros.ajusteId,
      responsavelId: filtros.responsavelId,
    };

    if (filtros.atrasadas) {
      // Vencida e ainda aberta. Encerrada nunca é atrasada: o prazo parou de
      // correr quando a providência foi tomada (ou descartada).
      where.prazoLegal = { lt: new Date(`${paraDataISO(new Date())}T00:00:00.000Z`) };
      where.status = { in: STATUS_ABERTOS };
    }

    if (busca) {
      const t = busca.trim();
      where.OR = [
        { titulo: { contains: t, mode: 'insensitive' } },
        { descricao: { contains: t, mode: 'insensitive' } },
        { ajuste: { codigoAjuste: { contains: t, mode: 'insensitive' } } },
        { ajuste: { entidadeBeneficiaria: { buscaTexto: { contains: normalizarTexto(t) } } } },
        { responsavel: { nome: { contains: t, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.tarefa.count({ where }),
      prisma.tarefa.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.TarefaOrderByWithRelationInput)
          : { prazoLegal: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map(toDomain),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async resumo(hoje: string): Promise<ResumoTarefas> {
    const inicioHoje = new Date(`${hoje}T00:00:00.000Z`);
    const em7Dias = new Date(inicioHoje.getTime());
    em7Dias.setUTCDate(em7Dias.getUTCDate() + 7);

    const abertas: Prisma.TarefaWhereInput = { status: { in: STATUS_ABERTOS } };

    const [total, atrasadas, venceEm7Dias, concluidas] = await Promise.all([
      prisma.tarefa.count({ where: abertas }),
      prisma.tarefa.count({ where: { ...abertas, prazoLegal: { lt: inicioHoje } } }),
      prisma.tarefa.count({ where: { ...abertas, prazoLegal: { gte: inicioHoje, lte: em7Dias } } }),
      prisma.tarefa.count({ where: { status: 'CONCLUIDA' } }),
    ]);

    return { abertas: total, atrasadas, venceEm7Dias, concluidas };
  }
}

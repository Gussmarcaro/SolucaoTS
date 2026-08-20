import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ICompromissoRepository } from '@/application/compromisso/ICompromissoRepository';
import type {
  DadosCompromisso,
  ListarCompromissosParams,
  Paginado,
} from '@/application/compromisso/dtos';
import type { Compromisso, ResumoAgenda } from '@/core/compromisso/Compromisso';

const selecao = {
  id: true,
  tipo: true,
  titulo: true,
  pauta: true,
  inicioEm: true,
  duracaoMinutos: true,
  local: true,
  participantes: true,
  status: true,
  registro: true,
  ajusteId: true,
  responsavelId: true,
  criadoPor: true,
  criadoEm: true,
  atualizadoEm: true,
  ajuste: {
    select: { codigoAjuste: true, entidadeBeneficiaria: { select: { razaoSocial: true } } },
  },
  responsavel: { select: { nome: true } },
  _count: { select: { tarefas: true } },
} satisfies Prisma.CompromissoSelect;

type Row = Prisma.CompromissoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Compromisso {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    pauta: row.pauta,
    inicioEm: row.inicioEm.toISOString(),
    duracaoMinutos: row.duracaoMinutos,
    local: row.local,
    participantes: row.participantes,
    status: row.status,
    registro: row.registro,
    ajusteId: row.ajusteId,
    ajusteCodigo: row.ajuste?.codigoAjuste ?? null,
    entidadeNome: row.ajuste?.entidadeBeneficiaria?.razaoSocial ?? null,
    responsavelId: row.responsavelId,
    responsavelNome: row.responsavel?.nome ?? null,
    tarefas: row._count.tarefas,
    criadoPor: row.criadoPor,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaCompromissoRepository implements ICompromissoRepository {
  async buscarPorId(id: string): Promise<Compromisso | null> {
    const row = await prisma.compromisso.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosCompromisso): Promise<Compromisso> {
    const row = await prisma.compromisso.create({ data: dados, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosCompromisso): Promise<Compromisso> {
    const row = await prisma.compromisso.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.compromisso.delete({ where: { id } });
  }

  async ajusteExiste(ajusteId: string): Promise<boolean> {
    return (await prisma.ajuste.count({ where: { id: ajusteId } })) > 0;
  }

  async usuarioExiste(usuarioId: string): Promise<boolean> {
    return (await prisma.usuario.count({ where: { id: usuarioId } })) > 0;
  }

  async contarTarefas(id: string): Promise<number> {
    return prisma.tarefa.count({ where: { compromissoId: id } });
  }

  async listar({ filtros, busca, page, pageSize }: ListarCompromissosParams): Promise<Paginado<Compromisso>> {
    const where: Prisma.CompromissoWhereInput = {
      tipo: filtros.tipo,
      status: filtros.status,
      ajusteId: filtros.ajusteId,
      responsavelId: filtros.responsavelId,
    };

    if (filtros.de || filtros.ate) {
      where.inicioEm = { gte: filtros.de, lte: filtros.ate };
    }

    if (filtros.pendentesDeRegistro) {
      // Já passou e continua AGENDADO: ninguém registrou o que houve. Não é
      // "atraso" — é reunião que não deixou rastro.
      where.status = 'AGENDADO';
      where.inicioEm = { lt: new Date() };
    }

    if (busca) {
      const t = busca.trim();
      where.OR = [
        { titulo: { contains: t, mode: 'insensitive' } },
        { pauta: { contains: t, mode: 'insensitive' } },
        { local: { contains: t, mode: 'insensitive' } },
        { participantes: { contains: t, mode: 'insensitive' } },
        { ajuste: { codigoAjuste: { contains: t, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.compromisso.count({ where }),
      prisma.compromisso.findMany({
        where,
        select: selecao,
        // Ordem cronológica: agenda se lê do mais próximo para o mais distante.
        orderBy: { inicioEm: 'asc' },
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

  async resumo(agora: Date): Promise<ResumoAgenda> {
    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);

    const [proximos, hoje, pendentesDeRegistro, realizados] = await Promise.all([
      prisma.compromisso.count({ where: { status: 'AGENDADO', inicioEm: { gte: agora } } }),
      prisma.compromisso.count({
        where: { status: 'AGENDADO', inicioEm: { gte: inicioDoDia, lte: fimDoDia } },
      }),
      prisma.compromisso.count({ where: { status: 'AGENDADO', inicioEm: { lt: agora } } }),
      prisma.compromisso.count({ where: { status: 'REALIZADO' } }),
    ]);

    return { proximos, hoje, pendentesDeRegistro, realizados };
  }
}

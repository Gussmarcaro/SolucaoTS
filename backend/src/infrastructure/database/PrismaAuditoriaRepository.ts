import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type {
  FiltrosAuditoria,
  IAuditoriaRepository,
  Paginado,
} from '@/application/auditoria/IAuditoriaRepository';
import type { RegistroAuditoria } from '@/core/auditoria/RegistroAuditoria';

function montarWhere(f: FiltrosAuditoria): Prisma.RegistroAuditoriaWhereInput {
  const where: Prisma.RegistroAuditoriaWhereInput = {
    entidade: f.entidade,
    registroId: f.registroId,
    usuarioId: f.usuarioId,
    acao: f.acao,
  };
  if (f.de || f.ate) {
    where.ocorridoEm = {
      gte: f.de ? new Date(`${f.de}T00:00:00.000Z`) : undefined,
      // Até o fim do dia informado, senão o filtro "ate = hoje" perderia hoje.
      lte: f.ate ? new Date(`${f.ate}T23:59:59.999Z`) : undefined,
    };
  }
  return where;
}

export class PrismaAuditoriaRepository implements IAuditoriaRepository {
  async listar({
    filtros,
    page,
    pageSize,
  }: {
    filtros: FiltrosAuditoria;
    page: number;
    pageSize: number;
  }): Promise<Paginado<RegistroAuditoria>> {
    const where = montarWhere(filtros);
    const [data, total] = await Promise.all([
      prisma.registroAuditoria.findMany({
        where,
        orderBy: { ocorridoEm: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.registroAuditoria.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  historico(entidade: string, registroId: string): Promise<RegistroAuditoria[]> {
    return prisma.registroAuditoria.findMany({
      where: { entidade, registroId },
      orderBy: { ocorridoEm: 'desc' },
    });
  }

  async entidadesRegistradas(): Promise<string[]> {
    const linhas = await prisma.registroAuditoria.findMany({
      distinct: ['entidade'],
      select: { entidade: true },
      orderBy: { entidade: 'asc' },
    });
    return linhas.map((l) => l.entidade);
  }
}

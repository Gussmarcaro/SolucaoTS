import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { NAO_AUDITAR } from './extensaoAuditoria';
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
    registroDescricao: f.busca ? { contains: f.busca, mode: 'insensitive' } : undefined,
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

  /**
   * Todos os cadastros que a trilha cobre, lidos do schema.
   *
   * Antes vinha de um `distinct` sobre a própria trilha, o que listava só o que
   * já tinha sido alterado alguma vez — o filtro nascia incompleto e ia se
   * completando conforme o sistema era usado. Cadastro novo agora aparece
   * sozinho, sem precisar de uma primeira alteração para existir na lista.
   */
  async entidadesAuditaveis(): Promise<string[]> {
    const models = Prisma.dmmf.datamodel.models
      .map((m) => m.name)
      .filter((nome) => !NAO_AUDITAR.has(nome));

    // `Titular` não é model: é o registro da consulta por CPF (LGPD, art. 18),
    // gravado na trilha com esse nome.
    return [...models, 'Titular'].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IGrupoRepository } from '@/application/grupo/IGrupoRepository';
import type { DadosGrupo, ListarGruposParams, Paginado } from '@/application/grupo/dtos';
import type { Grupo, GrupoResumo } from '@/core/grupo/Grupo';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaGrupo } from './buscaTexto';

const selecao = {
  id: true,
  nome: true,
  descricao: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
  _count: { select: { membros: true } },
} satisfies Prisma.GrupoUsuarioSelect;

type Row = Prisma.GrupoUsuarioGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Grupo {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    ativo: row.ativo,
    totalMembros: row._count.membros,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaGrupoRepository implements IGrupoRepository {
  async buscarPorId(id: string): Promise<Grupo | null> {
    const row = await prisma.grupoUsuario.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorNome(nome: string): Promise<Grupo | null> {
    const row = await prisma.grupoUsuario.findUnique({ where: { nome }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async contarMembros(id: string): Promise<number> {
    return prisma.usuario.count({ where: { grupoUsuarioId: id } });
  }

  async criar(dados: DadosGrupo): Promise<Grupo> {
    const row = await prisma.grupoUsuario.create({
      data: { ...dados, buscaTexto: buscaGrupo(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosGrupo): Promise<Grupo> {
    const row = await prisma.grupoUsuario.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaGrupo(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Grupo> {
    const row = await prisma.grupoUsuario.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.grupoUsuario.delete({ where: { id } });
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarGruposParams): Promise<Paginado<Grupo>> {
    const where: Prisma.GrupoUsuarioWhereInput = {
      nome: filtros.nome ? { contains: filtros.nome, mode: 'insensitive' } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      if (t) where.OR = [{ buscaTexto: { contains: t } }];
    }

    const [total, rows] = await Promise.all([
      prisma.grupoUsuario.count({ where }),
      prisma.grupoUsuario.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.GrupoUsuarioOrderByWithRelationInput)
          : { nome: 'asc' },
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

  async listarAtivos(): Promise<GrupoResumo[]> {
    return prisma.grupoUsuario.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  }
}

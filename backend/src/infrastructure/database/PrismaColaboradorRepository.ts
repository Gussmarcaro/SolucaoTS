import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IColaboradorRepository } from '@/application/colaborador/IColaboradorRepository';
import type {
  DadosColaborador,
  ListarColaboradoresParams,
  Paginado,
} from '@/application/colaborador/dtos';
import type { Colaborador } from '@/core/colaborador/Colaborador';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { paraDataISO } from '@/shared/datas';
import { buscaColaborador } from './buscaTexto';

const selecao = {
  id: true,
  nome: true,
  cpf: true,
  cargo: true,
  cbo: true,
  cns: true,
  dataAdmissao: true,
  dataDemissao: true,
  salarioContratual: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.ColaboradorSelect;

type Row = Prisma.ColaboradorGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Colaborador {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    cargo: row.cargo,
    cbo: row.cbo,
    cns: row.cns,
    dataAdmissao: paraDataISO(row.dataAdmissao),
    dataDemissao: row.dataDemissao ? paraDataISO(row.dataDemissao) : null,
    salarioContratual: Number(row.salarioContratual),
    ativo: row.ativo,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaColaboradorRepository implements IColaboradorRepository {
  async buscarPorId(id: string): Promise<Colaborador | null> {
    const row = await prisma.colaborador.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorCpf(cpf: string): Promise<Colaborador | null> {
    const row = await prisma.colaborador.findUnique({
      where: { cpf: apenasDigitos(cpf) },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosColaborador): Promise<Colaborador> {
    const row = await prisma.colaborador.create({
      data: { ...dados, buscaTexto: buscaColaborador(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosColaborador): Promise<Colaborador> {
    const row = await prisma.colaborador.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaColaborador(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Colaborador> {
    const row = await prisma.colaborador.update({
      where: { id },
      data: { ativo },
      select: selecao,
    });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarColaboradoresParams): Promise<Paginado<Colaborador>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.ColaboradorWhereInput = {
      nome: texto(filtros.nome),
      cargo: texto(filtros.cargo),
      cpf: filtros.cpf ? { contains: apenasDigitos(filtros.cpf) } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.ColaboradorWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d) ors.push({ cpf: { contains: d } }, { cbo: { contains: d } }, { cns: { contains: d } });
      if (ors.length) where.OR = ors;
    }

    const [total, rows] = await Promise.all([
      prisma.colaborador.count({ where }),
      prisma.colaborador.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.ColaboradorOrderByWithRelationInput)
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
}

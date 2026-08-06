import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IBemCedidoRepository } from '@/application/bemCedido/IBemCedidoRepository';
import type { DadosBemCedido, ListarBensCedidosParams, Paginado } from '@/application/bemCedido/dtos';
import type { BemCedido } from '@/core/bemCedido/BemCedido';
import { normalizarTexto } from '@/shared/normalizar';
import { paraDataISO } from '@/shared/datas';
import { buscaBemCedido } from './buscaTexto';

const selecao = {
  id: true,
  descricao: true,
  tipo: true,
  identificador: true,
  valor: true,
  dataCessao: true,
  dataDevolucao: true,
  observacao: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.BemCedidoSelect;

type Row = Prisma.BemCedidoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): BemCedido {
  return {
    id: row.id,
    descricao: row.descricao,
    tipo: row.tipo,
    identificador: row.identificador,
    valor: Number(row.valor),
    dataCessao: paraDataISO(row.dataCessao),
    dataDevolucao: row.dataDevolucao ? paraDataISO(row.dataDevolucao) : null,
    observacao: row.observacao,
    ativo: row.ativo,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaBemCedidoRepository implements IBemCedidoRepository {
  async buscarPorId(id: string): Promise<BemCedido | null> {
    const row = await prisma.bemCedido.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorIdentificador(identificador: string): Promise<BemCedido | null> {
    const row = await prisma.bemCedido.findUnique({
      where: { identificador },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosBemCedido): Promise<BemCedido> {
    const row = await prisma.bemCedido.create({
      data: { ...dados, buscaTexto: buscaBemCedido(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosBemCedido): Promise<BemCedido> {
    const row = await prisma.bemCedido.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaBemCedido(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<BemCedido> {
    const row = await prisma.bemCedido.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarBensCedidosParams): Promise<Paginado<BemCedido>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.BemCedidoWhereInput = {
      descricao: texto(filtros.descricao),
      tipo: filtros.tipo ? { equals: filtros.tipo } : undefined,
      identificador: texto(filtros.identificador),
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      if (t) where.OR = [{ buscaTexto: { contains: t } }];
    }

    const [total, rows] = await Promise.all([
      prisma.bemCedido.count({ where }),
      prisma.bemCedido.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.BemCedidoOrderByWithRelationInput)
          : { descricao: 'asc' },
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

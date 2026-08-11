import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosAjuste, ListarAjustesParams, Paginado } from '@/application/ajuste/dtos';
import type { Ajuste, Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  entidadeBeneficiariaId: true,
  tipoAjuste: true,
  nomeResumido: true,
  codigoAjuste: true,
  numero: true,
  objeto: true,
  valorGlobal: true,
  dataAssinatura: true,
  vigenciaInicial: true,
  vigenciaFinal: true,
  periodicidade: true,
  status: true,
  criadoEm: true,
  atualizadoEm: true,
  entidadeBeneficiaria: { select: { razaoSocial: true } },
  cliente: { select: { nome: true } },
} satisfies Prisma.AjusteSelect;

type Row = Prisma.AjusteGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Ajuste {
  return {
    id: row.id,
    clienteId: row.clienteId ?? null,
    orgaoNome: row.cliente?.nome ?? null,
    entidadeBeneficiariaId: row.entidadeBeneficiariaId,
    entidadeNome: row.entidadeBeneficiaria?.razaoSocial ?? '',
    tipoAjuste: row.tipoAjuste as TipoAjuste,
    nomeResumido: row.nomeResumido,
    codigoAjuste: row.codigoAjuste,
    numero: row.numero,
    objeto: row.objeto,
    valorGlobal: Number(row.valorGlobal),
    dataAssinatura: paraDataISO(row.dataAssinatura),
    vigenciaInicial: row.vigenciaInicial ? paraDataISO(row.vigenciaInicial) : null,
    vigenciaFinal: row.vigenciaFinal ? paraDataISO(row.vigenciaFinal) : null,
    periodicidade: row.periodicidade as Periodicidade,
    status: row.status as StatusAjuste,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

/** Campos escalares persistidos (sem o join de leitura). */
function toData(dados: DadosAjuste) {
  return {
    clienteId: dados.clienteId,
    entidadeBeneficiariaId: dados.entidadeBeneficiariaId,
    tipoAjuste: dados.tipoAjuste,
    nomeResumido: dados.nomeResumido,
    codigoAjuste: dados.codigoAjuste,
    numero: dados.numero,
    objeto: dados.objeto,
    valorGlobal: dados.valorGlobal,
    dataAssinatura: dados.dataAssinatura,
    vigenciaInicial: dados.vigenciaInicial,
    vigenciaFinal: dados.vigenciaFinal,
    periodicidade: dados.periodicidade,
    status: dados.status,
  };
}

export class PrismaAjusteRepository implements IAjusteRepository {
  async buscarPorId(id: string): Promise<Ajuste | null> {
    const row = await prisma.ajuste.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null> {
    const row = await prisma.ajuste.findUnique({ where: { codigoAjuste }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean> {
    const e = await prisma.entidadeBeneficiaria.findUnique({
      where: { id: entidadeBeneficiariaId },
      select: { id: true },
    });
    return !!e;
  }

  async clienteExiste(clienteId: string): Promise<boolean> {
    const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    return !!c;
  }

  async criar(dados: DadosAjuste): Promise<Ajuste> {
    const row = await prisma.ajuste.create({ data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosAjuste): Promise<Ajuste> {
    const row = await prisma.ajuste.update({ where: { id }, data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarAjustesParams): Promise<Paginado<Ajuste>> {
    const where: Prisma.AjusteWhereInput = {
      codigoAjuste: filtros.codigoAjuste ? { contains: filtros.codigoAjuste } : undefined,
      tipoAjuste: filtros.tipoAjuste ? { equals: filtros.tipoAjuste as TipoAjuste } : undefined,
      status: filtros.status ? { equals: filtros.status as StatusAjuste } : undefined,
      entidadeBeneficiariaId: filtros.entidadeBeneficiariaId || undefined,
    };

    if (busca) {
      where.OR = [
        { codigoAjuste: { contains: busca, mode: 'insensitive' } },
        { nomeResumido: { contains: busca, mode: 'insensitive' } },
        { numero: { contains: busca, mode: 'insensitive' } },
        { objeto: { contains: busca, mode: 'insensitive' } },
        { entidadeBeneficiaria: { razaoSocial: { contains: busca, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.ajuste.count({ where }),
      prisma.ajuste.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.AjusteOrderByWithRelationInput)
          : { dataAssinatura: 'desc' },
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

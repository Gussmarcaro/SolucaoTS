import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosCriarPrestacao, ListarPrestacoesParams, Paginado } from '@/application/prestacao/dtos';
import type { Prestacao, StatusPrestacao } from '@/core/prestacao/Prestacao';

const selecao = {
  id: true,
  ajusteId: true,
  tipoDocumento: true,
  ano: true,
  mes: true,
  status: true,
  protocolo: true,
  ehRetificacao: true,
  dataEnvio: true,
  criadoEm: true,
  atualizadoEm: true,
  ajuste: {
    select: {
      codigoAjuste: true,
      tipoAjuste: true,
      entidadeBeneficiaria: { select: { razaoSocial: true } },
    },
  },
} satisfies Prisma.PrestacaoContasSelect;

type Row = Prisma.PrestacaoContasGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Prestacao {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    ajusteCodigo: row.ajuste?.codigoAjuste ?? '',
    ajusteTipo: row.ajuste?.tipoAjuste ?? '',
    entidadeNome: row.ajuste?.entidadeBeneficiaria?.razaoSocial ?? '',
    tipoDocumento: row.tipoDocumento,
    ano: row.ano,
    mes: row.mes,
    status: row.status as StatusPrestacao,
    protocolo: row.protocolo,
    ehRetificacao: row.ehRetificacao,
    dataEnvio: row.dataEnvio ? row.dataEnvio.toISOString() : null,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaPrestacaoRepository implements IPrestacaoRepository {
  async buscarPorId(id: string): Promise<Prestacao | null> {
    const row = await prisma.prestacaoContas.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorAjusteAno(ajusteId: string, ano: number): Promise<Prestacao | null> {
    const row = await prisma.prestacaoContas.findFirst({
      where: { ajusteId, ano },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosCriarPrestacao): Promise<Prestacao> {
    const row = await prisma.prestacaoContas.create({ data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.prestacaoContas.delete({ where: { id } });
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarPrestacoesParams): Promise<Paginado<Prestacao>> {
    const where: Prisma.PrestacaoContasWhereInput = {
      status: filtros.status ? { equals: filtros.status as StatusPrestacao } : undefined,
      ano: typeof filtros.ano === 'number' ? filtros.ano : undefined,
      ajusteId: filtros.ajusteId || undefined,
    };

    if (busca) {
      where.OR = [
        { protocolo: { contains: busca, mode: 'insensitive' } },
        { ajuste: { codigoAjuste: { contains: busca, mode: 'insensitive' } } },
        { ajuste: { entidadeBeneficiaria: { razaoSocial: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.prestacaoContas.count({ where }),
      prisma.prestacaoContas.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.PrestacaoContasOrderByWithRelationInput)
          : [{ ano: 'desc' }, { criadoEm: 'desc' }],
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

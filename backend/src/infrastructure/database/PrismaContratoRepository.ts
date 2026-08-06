import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IContratoRepository } from '@/application/contrato/IContratoRepository';
import type { DadosContrato, ListarContratosParams, Paginado } from '@/application/contrato/dtos';
import type { Contrato } from '@/core/contrato/Contrato';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { paraDataISO } from '@/shared/datas';
import { buscaContrato } from './buscaTexto';

const selecao = {
  id: true,
  numero: true,
  credorNome: true,
  credorDocumento: true,
  credorDocumentoTipo: true,
  naturezaContratacao: true,
  objeto: true,
  dataAssinatura: true,
  vigenciaInicio: true,
  vigenciaFim: true,
  valorMontante: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.ContratoFirmadoSelect;

type Row = Prisma.ContratoFirmadoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Contrato {
  return {
    id: row.id,
    numero: row.numero,
    credorNome: row.credorNome,
    credorDocumento: row.credorDocumento,
    credorDocumentoTipo: row.credorDocumentoTipo as 'CPF' | 'CNPJ',
    naturezaContratacao: row.naturezaContratacao,
    objeto: row.objeto,
    dataAssinatura: paraDataISO(row.dataAssinatura),
    vigenciaInicio: paraDataISO(row.vigenciaInicio),
    vigenciaFim: row.vigenciaFim ? paraDataISO(row.vigenciaFim) : null,
    valorMontante: Number(row.valorMontante),
    ativo: row.ativo,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaContratoRepository implements IContratoRepository {
  async buscarPorId(id: string): Promise<Contrato | null> {
    const row = await prisma.contratoFirmado.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorNumeroCredor(
    numero: string,
    credorDocumento: string,
  ): Promise<Contrato | null> {
    const row = await prisma.contratoFirmado.findUnique({
      where: {
        numero_credorDocumento: { numero, credorDocumento: apenasDigitos(credorDocumento) },
      },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosContrato): Promise<Contrato> {
    const row = await prisma.contratoFirmado.create({
      data: { ...dados, buscaTexto: buscaContrato(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosContrato): Promise<Contrato> {
    const row = await prisma.contratoFirmado.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaContrato(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Contrato> {
    const row = await prisma.contratoFirmado.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarContratosParams): Promise<Paginado<Contrato>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.ContratoFirmadoWhereInput = {
      numero: texto(filtros.numero),
      credorNome: texto(filtros.credorNome),
      naturezaContratacao: texto(filtros.naturezaContratacao),
      credorDocumento: filtros.credorDocumento
        ? { contains: apenasDigitos(filtros.credorDocumento) }
        : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.ContratoFirmadoWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d) ors.push({ credorDocumento: { contains: d } });
      if (ors.length) where.OR = ors;
    }

    const [total, rows] = await Promise.all([
      prisma.contratoFirmado.count({ where }),
      prisma.contratoFirmado.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.ContratoFirmadoOrderByWithRelationInput)
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

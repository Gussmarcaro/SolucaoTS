import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IContratoPrestacaoRepository } from '@/application/contratoPrestacao/IContratoPrestacaoRepository';
import type { DadosContrato } from '@/application/contratoPrestacao/dtos';
import type { ContratoPrestacao } from '@/core/contratoPrestacao/ContratoPrestacao';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  numero: true,
  credorTipoDoc: true,
  credorNumeroDoc: true,
  credorNome: true,
  dataAssinatura: true,
  vigenciaTipo: true,
  vigenciaDataInicial: true,
  vigenciaDataFinal: true,
  objeto: true,
  naturezaContratacao: true,
  naturezaOutro: true,
  criterioSelecao: true,
  criterioSelecaoOutro: true,
  artigoRegulamentoCompras: true,
  valorMontante: true,
  valorTipo: true,
} satisfies Prisma.ContratoSelect;

type Row = Prisma.ContratoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): ContratoPrestacao {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    numero: row.numero,
    credorTipoDoc: row.credorTipoDoc,
    credorNumeroDoc: row.credorNumeroDoc,
    credorNome: row.credorNome,
    dataAssinatura: paraDataISO(row.dataAssinatura),
    vigenciaTipo: row.vigenciaTipo,
    vigenciaDataInicial: paraDataISO(row.vigenciaDataInicial),
    vigenciaDataFinal: row.vigenciaDataFinal ? paraDataISO(row.vigenciaDataFinal) : null,
    objeto: row.objeto,
    naturezaContratacao: row.naturezaContratacao,
    naturezaOutro: row.naturezaOutro,
    criterioSelecao: row.criterioSelecao,
    criterioSelecaoOutro: row.criterioSelecaoOutro,
    artigoRegulamentoCompras: row.artigoRegulamentoCompras,
    valorMontante: Number(row.valorMontante),
    valorTipo: row.valorTipo,
  };
}

export class PrismaContratoPrestacaoRepository implements IContratoPrestacaoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<ContratoPrestacao[]> {
    const rows = await prisma.contrato.findMany({ where: { prestacaoId }, select: selecao, orderBy: { dataAssinatura: 'asc' } });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<ContratoPrestacao | null> {
    const row = await prisma.contrato.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosContrato): Promise<ContratoPrestacao> {
    const row = await prisma.contrato.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosContrato): Promise<ContratoPrestacao> {
    const row = await prisma.contrato.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.contrato.delete({ where: { id } });
  }
}

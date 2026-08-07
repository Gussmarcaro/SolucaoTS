import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IServidorPrestacaoRepository } from '@/application/servidorPrestacao/IServidorPrestacaoRepository';
import type { DadosServidorPrestacao } from '@/application/servidorPrestacao/dtos';
import type { PeriodoCessao, ServidorPrestacao } from '@/core/servidorPrestacao/ServidorPrestacao';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  cpf: true,
  dataInicialCessao: true,
  dataFinalCessao: true,
  cargoPublico: true,
  funcaoEntidade: true,
  onusPagamento: true,
  periodos: true,
} satisfies Prisma.ServidorCedidoSelect;

type Row = Prisma.ServidorCedidoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): ServidorPrestacao {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    cpf: row.cpf,
    dataInicialCessao: paraDataISO(row.dataInicialCessao),
    dataFinalCessao: row.dataFinalCessao ? paraDataISO(row.dataFinalCessao) : null,
    cargoPublico: row.cargoPublico,
    funcaoEntidade: row.funcaoEntidade,
    onusPagamento: row.onusPagamento,
    periodos: (row.periodos as unknown as PeriodoCessao[]) ?? [],
  };
}

function toData(dados: DadosServidorPrestacao) {
  return {
    cpf: dados.cpf,
    dataInicialCessao: dados.dataInicialCessao,
    dataFinalCessao: dados.dataFinalCessao,
    cargoPublico: dados.cargoPublico,
    funcaoEntidade: dados.funcaoEntidade,
    onusPagamento: dados.onusPagamento,
    periodos: dados.periodos as unknown as Prisma.InputJsonValue,
  };
}

export class PrismaServidorPrestacaoRepository implements IServidorPrestacaoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<ServidorPrestacao[]> {
    const rows = await prisma.servidorCedido.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { dataInicialCessao: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<ServidorPrestacao | null> {
    const row = await prisma.servidorCedido.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(prestacaoId: string, cpf: string, dataInicialCessao: Date): Promise<ServidorPrestacao | null> {
    const row = await prisma.servidorCedido.findUnique({
      where: { prestacaoId_cpf_dataInicialCessao: { prestacaoId, cpf, dataInicialCessao } },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosServidorPrestacao): Promise<ServidorPrestacao> {
    const row = await prisma.servidorCedido.create({ data: { prestacaoId, ...toData(dados) }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosServidorPrestacao): Promise<ServidorPrestacao> {
    const row = await prisma.servidorCedido.update({ where: { id }, data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.servidorCedido.delete({ where: { id } });
  }
}

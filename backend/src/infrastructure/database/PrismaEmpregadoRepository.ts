import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IEmpregadoRepository } from '@/application/empregado/IEmpregadoRepository';
import type { DadosEmpregado } from '@/application/empregado/dtos';
import type { Empregado, PeriodoRemuneracao } from '@/core/empregado/Empregado';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  cpf: true,
  dataAdmissao: true,
  dataDemissao: true,
  cbo: true,
  cns: true,
  salarioContratual: true,
  periodos: true,
} satisfies Prisma.RelacaoEmpregadoSelect;

type Row = Prisma.RelacaoEmpregadoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Empregado {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    cpf: row.cpf,
    dataAdmissao: paraDataISO(row.dataAdmissao),
    dataDemissao: row.dataDemissao ? paraDataISO(row.dataDemissao) : null,
    cbo: row.cbo,
    cns: row.cns,
    salarioContratual: Number(row.salarioContratual),
    periodos: (row.periodos as unknown as PeriodoRemuneracao[]) ?? [],
  };
}

function toData(dados: DadosEmpregado) {
  return {
    cpf: dados.cpf,
    dataAdmissao: dados.dataAdmissao,
    dataDemissao: dados.dataDemissao,
    cbo: dados.cbo,
    cns: dados.cns,
    salarioContratual: dados.salarioContratual,
    periodos: dados.periodos as unknown as Prisma.InputJsonValue,
  };
}

export class PrismaEmpregadoRepository implements IEmpregadoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Empregado[]> {
    const rows = await prisma.relacaoEmpregado.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { dataAdmissao: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Empregado | null> {
    const row = await prisma.relacaoEmpregado.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(prestacaoId: string, cpf: string, dataAdmissao: Date): Promise<Empregado | null> {
    const row = await prisma.relacaoEmpregado.findUnique({
      where: { prestacaoId_cpf_dataAdmissao: { prestacaoId, cpf, dataAdmissao } },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosEmpregado): Promise<Empregado> {
    const row = await prisma.relacaoEmpregado.create({
      data: { prestacaoId, ...toData(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosEmpregado): Promise<Empregado> {
    const row = await prisma.relacaoEmpregado.update({ where: { id }, data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.relacaoEmpregado.delete({ where: { id } });
  }
}

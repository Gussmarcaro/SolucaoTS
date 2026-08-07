import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IEmpenhoPrestacaoRepository } from '@/application/empenhoPrestacao/IEmpenhoPrestacaoRepository';
import type { DadosEmpenhoPrestacao } from '@/application/empenhoPrestacao/dtos';
import type { EmpenhoPrestacao } from '@/core/empenhoPrestacao/EmpenhoPrestacao';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  numero: true,
  dataEmissao: true,
  classificacaoEconomica: true,
  fonteRecursoTipo: true,
  valor: true,
  historico: true,
  cpfOrdenadorDespesa: true,
} satisfies Prisma.EmpenhoPrestacaoSelect;

type Row = Prisma.EmpenhoPrestacaoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): EmpenhoPrestacao {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    numero: row.numero,
    dataEmissao: paraDataISO(row.dataEmissao),
    classificacaoEconomica: row.classificacaoEconomica,
    fonteRecursoTipo: row.fonteRecursoTipo,
    valor: Number(row.valor),
    historico: row.historico,
    cpfOrdenadorDespesa: row.cpfOrdenadorDespesa,
  };
}

export class PrismaEmpenhoPrestacaoRepository implements IEmpenhoPrestacaoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<EmpenhoPrestacao[]> {
    const rows = await prisma.empenhoPrestacao.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ dataEmissao: 'asc' }, { numero: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<EmpenhoPrestacao | null> {
    const row = await prisma.empenhoPrestacao.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(prestacaoId: string, numero: string, dataEmissao: Date): Promise<EmpenhoPrestacao | null> {
    const row = await prisma.empenhoPrestacao.findUnique({
      where: { prestacaoId_numero_dataEmissao: { prestacaoId, numero, dataEmissao } },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosEmpenhoPrestacao): Promise<EmpenhoPrestacao> {
    const row = await prisma.empenhoPrestacao.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosEmpenhoPrestacao): Promise<EmpenhoPrestacao> {
    const row = await prisma.empenhoPrestacao.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.empenhoPrestacao.delete({ where: { id } });
  }
}

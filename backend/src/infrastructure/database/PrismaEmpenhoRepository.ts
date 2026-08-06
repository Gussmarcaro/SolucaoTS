import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IEmpenhoRepository } from '@/application/empenho/IEmpenhoRepository';
import type { DadosEmpenho } from '@/application/empenho/dtos';
import type { Empenho } from '@/core/empenho/Empenho';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  ajusteId: true,
  numeroEmpenho: true,
  anoEmpenho: true,
  retificacao: true,
  dataEmissaoEmpenho: true,
} satisfies Prisma.EmpenhoCadastroSelect;

type Row = Prisma.EmpenhoCadastroGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Empenho {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    numeroEmpenho: row.numeroEmpenho,
    anoEmpenho: row.anoEmpenho,
    retificacao: row.retificacao,
    dataEmissaoEmpenho: paraDataISO(row.dataEmissaoEmpenho),
  };
}

export class PrismaEmpenhoRepository implements IEmpenhoRepository {
  async listarPorAjuste(ajusteId: string): Promise<Empenho[]> {
    const rows = await prisma.empenhoCadastro.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: [{ anoEmpenho: 'desc' }, { numeroEmpenho: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Empenho | null> {
    const row = await prisma.empenhoCadastro.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(
    ajusteId: string,
    numeroEmpenho: string,
    anoEmpenho: number,
  ): Promise<Empenho | null> {
    const row = await prisma.empenhoCadastro.findUnique({
      where: { ajusteId_numeroEmpenho_anoEmpenho: { ajusteId, numeroEmpenho, anoEmpenho } },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(ajusteId: string, dados: DadosEmpenho): Promise<Empenho> {
    const row = await prisma.empenhoCadastro.create({
      data: { ajusteId, ...dados },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosEmpenho): Promise<Empenho> {
    const row = await prisma.empenhoCadastro.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.empenhoCadastro.delete({ where: { id } });
  }
}

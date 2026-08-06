import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IPagamentoRepository } from '@/application/pagamento/IPagamentoRepository';
import type { DadosPagamento } from '@/application/pagamento/dtos';
import type { Pagamento, MeioPagamento } from '@/core/pagamento/Pagamento';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  documentoFiscalId: true,
  dataPagamento: true,
  valor: true,
  fonteRecursoTipo: true,
  meioPagamento: true,
  banco: true,
  agencia: true,
  contaCorrente: true,
  numeroTransacao: true,
  documentoFiscal: { select: { numero: true } },
} satisfies Prisma.PagamentoSelect;

type Row = Prisma.PagamentoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Pagamento {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    documentoFiscalId: row.documentoFiscalId,
    documentoNumero: row.documentoFiscal?.numero ?? null,
    dataPagamento: paraDataISO(row.dataPagamento),
    valor: Number(row.valor),
    fonteRecursoTipo: row.fonteRecursoTipo,
    meioPagamento: row.meioPagamento as MeioPagamento,
    banco: row.banco,
    agencia: row.agencia,
    contaCorrente: row.contaCorrente,
    numeroTransacao: row.numeroTransacao,
  };
}

export class PrismaPagamentoRepository implements IPagamentoRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Pagamento[]> {
    const rows = await prisma.pagamento.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { dataPagamento: 'asc' },
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Pagamento | null> {
    const row = await prisma.pagamento.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean> {
    const d = await prisma.documentoFiscal.findFirst({
      where: { id: documentoFiscalId, prestacaoId },
      select: { id: true },
    });
    return !!d;
  }

  async criar(prestacaoId: string, dados: DadosPagamento): Promise<Pagamento> {
    const row = await prisma.pagamento.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosPagamento): Promise<Pagamento> {
    const row = await prisma.pagamento.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.pagamento.delete({ where: { id } });
  }
}

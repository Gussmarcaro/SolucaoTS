import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDisponibilidadeRepository } from '@/application/disponibilidade/IDisponibilidadeRepository';
import type { DadosDisponibilidade } from '@/application/disponibilidade/dtos';
import type { Disponibilidade } from '@/core/disponibilidade/Disponibilidade';
import { saldoContabilDaConta, type SaldoSugerido } from '@/application/disponibilidade/saldoContabil';
import { chaveDaConta } from '@/core/conciliacao/contas';

const selecao = {
  id: true,
  prestacaoId: true,
  banco: true,
  agencia: true,
  conta: true,
  contaTipo: true,
  saldoBancario: true,
  saldoContabil: true,
} satisfies Prisma.DisponibilidadeSelect;

type Row = Prisma.DisponibilidadeGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Disponibilidade {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
    contaTipo: row.contaTipo,
    saldoBancario: Number(row.saldoBancario),
    saldoContabil: Number(row.saldoContabil),
  };
}

export class PrismaDisponibilidadeRepository implements IDisponibilidadeRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Disponibilidade[]> {
    const rows = await prisma.disponibilidade.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ banco: 'asc' }, { agencia: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<Disponibilidade | null> {
    const row = await prisma.disponibilidade.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosDisponibilidade): Promise<Disponibilidade> {
    const row = await prisma.disponibilidade.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDisponibilidade): Promise<Disponibilidade> {
    const row = await prisma.disponibilidade.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.disponibilidade.delete({ where: { id } });
  }

  /**
   * O movimento de cada conta da parceria até 31/12 do exercício.
   *
   * **Parte das contas declaradas no ajuste**, e não dos lançamentos: a lista
   * precisa trazer também a conta que não teve movimento nenhum — saldo zero
   * é informação, e uma conta que some do quadro parece esquecimento.
   *
   * A soma agrupa por `chaveDaConta`, a mesma da conciliação: o lançamento
   * grava `123655-9` onde o cadastro grava `1236559`, e agrupar por texto
   * cru partiria a mesma conta em duas.
   */
  async saldosSugeridos(prestacaoId: string): Promise<SaldoSugerido[]> {
    const prestacao = await prisma.prestacaoContas.findFirst({
      where: { id: prestacaoId },
      select: { ano: true, ajusteId: true },
    });
    if (!prestacao) return [];

    // O último dia do exercício, que é o que o manual fixa como data do saldo.
    const ate = new Date(Date.UTC(prestacao.ano, 11, 31));

    const [contas, receitas, pagamentos] = await Promise.all([
      prisma.ajusteContaBancaria.findMany({
        where: { ajusteId: prestacao.ajusteId },
        select: { banco: true, agencia: true, conta: true },
      }),
      prisma.receita.findMany({
        where: { ajusteId: prestacao.ajusteId, dataRepasse: { lte: ate } },
        select: { valor: true, banco: true, agencia: true, contaCorrente: true },
      }),
      prisma.pagamento.findMany({
        where: { ajusteId: prestacao.ajusteId, dataPagamento: { lte: ate } },
        select: { valor: true, banco: true, agencia: true, contaCorrente: true },
      }),
    ]);

    const porChave = new Map<
      string,
      { banco: number | null; agencia: string | number | null; conta: string | null; entradas: number; saidas: number; lancamentos: number }
    >();

    const garantir = (c: { banco: number | null; agencia: string | number | null; conta: string | null }) => {
      const k = chaveDaConta(c);
      const atual = porChave.get(k);
      if (atual) return atual;
      const novo = { banco: c.banco, agencia: c.agencia, conta: c.conta, entradas: 0, saidas: 0, lancamentos: 0 };
      porChave.set(k, novo);
      return novo;
    };

    for (const c of contas) garantir(c);

    for (const r of receitas) {
      const l = garantir({ banco: r.banco, agencia: r.agencia, conta: r.contaCorrente });
      l.entradas += Number(r.valor);
      l.lancamentos += 1;
    }
    for (const g of pagamentos) {
      const l = garantir({ banco: g.banco, agencia: g.agencia, conta: g.contaCorrente });
      l.saidas += Number(g.valor);
      l.lancamentos += 1;
    }

    return [...porChave.values()].map((l) => saldoContabilDaConta(l, l.lancamentos));
  }

  async obterSaldoFundoFixo(prestacaoId: string): Promise<number> {
    const row = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: { saldoFundoFixo: true },
    });
    return Number(row?.saldoFundoFixo ?? 0);
  }

  async definirSaldoFundoFixo(prestacaoId: string, valor: number): Promise<number> {
    const row = await prisma.prestacaoContas.update({
      where: { id: prestacaoId },
      data: { saldoFundoFixo: valor },
      select: { saldoFundoFixo: true },
    });
    return Number(row.saldoFundoFixo);
  }
}

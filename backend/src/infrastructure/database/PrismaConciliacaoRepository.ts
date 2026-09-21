import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { tenantObrigatorio } from '@/shared/contexto';
import type { IConciliacaoRepository } from '@/application/conciliacao/IConciliacaoRepository';
import type { ConciliarDTO, LinhaExtrato } from '@/application/conciliacao/dtos';
import type { LancamentoOfx, TipoLancamentoExtrato } from '@/infrastructure/parsers/parseOfx';
import type { Candidato } from '@/core/conciliacao/sugerir';
import { paraDataISO, parseDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  banco: true,
  agencia: true,
  conta: true,
  fitId: true,
  data: true,
  valor: true,
  tipo: true,
  descricao: true,
  pagamentoId: true,
  receitaId: true,
  conciliadoEm: true,
  ignorado: true,
  observacao: true,
} satisfies Prisma.LancamentoExtratoSelect;

type Row = Prisma.LancamentoExtratoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): LinhaExtrato {
  return {
    id: row.id,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
    fitId: row.fitId,
    data: paraDataISO(row.data),
    valor: Number(row.valor),
    tipo: row.tipo as TipoLancamentoExtrato,
    descricao: row.descricao,
    pagamentoId: row.pagamentoId,
    receitaId: row.receitaId,
    conciliadoEm: row.conciliadoEm ? row.conciliadoEm.toISOString() : null,
    ignorado: row.ignorado,
    observacao: row.observacao,
    sugestao: null,
  };
}

export class PrismaConciliacaoRepository implements IConciliacaoRepository {
  /**
   * Grava as linhas novas, ignorando as que já existem.
   *
   * `createMany` com `skipDuplicates`: a chave única por conta + FITID faz o
   * trabalho, numa ida ao banco em vez de uma consulta por linha. Reimportar um
   * extrato de 300 transações é operação comum, e conferir uma a uma custaria
   * 300 idas para não gravar nada.
   *
   * O `clienteId` vai **explícito** em cada linha. A extension de auditoria
   * também o carimba, mas quem obriga é o tipo: sem o campo isto não compila,
   * e era justamente aqui que o carimbo automático não chegava — o hook de
   * `createMany` só preenchia o autor, e o extrato inteiro entrava sem órgão.
   */
  async importar(
    conta: { banco: number | null; agencia: string | null; conta: string | null },
    lancamentos: LancamentoOfx[],
  ): Promise<{ novas: number; repetidas: number }> {
    const { count } = await prisma.lancamentoExtrato.createMany({
      data: lancamentos.map((l) => ({
        clienteId: tenantObrigatorio('LancamentoExtrato'),
        banco: conta.banco,
        agencia: conta.agencia,
        conta: conta.conta,
        fitId: l.fitId,
        data: parseDataISO(l.data),
        valor: l.valor,
        tipo: l.tipo,
        descricao: l.descricao,
      })),
      skipDuplicates: true,
    });
    return { novas: count, repetidas: lancamentos.length - count };
  }

  async listar(filtros: { de?: string; ate?: string }): Promise<LinhaExtrato[]> {
    const data: Prisma.DateTimeFilter = {};
    if (filtros.de) data.gte = parseDataISO(filtros.de);
    if (filtros.ate) data.lte = parseDataISO(filtros.ate);

    const rows = await prisma.lancamentoExtrato.findMany({
      where: Object.keys(data).length ? { data } : undefined,
      select: selecao,
      orderBy: [{ data: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<LinhaExtrato | null> {
    const row = await prisma.lancamentoExtrato.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async conciliar(id: string, dados: ConciliarDTO): Promise<LinhaExtrato> {
    const row = await prisma.lancamentoExtrato.update({
      where: { id },
      data: {
        pagamentoId: dados.pagamentoId ?? null,
        receitaId: dados.receitaId ?? null,
        ignorado: dados.ignorado ?? false,
        observacao: dados.observacao ?? null,
        // O carimbo é do servidor e derivado do estado: conciliado é ter par ou
        // ter sido ignorado. Recebê-lo do cliente deixaria gravar "conciliado
        // em" numa linha sem par nenhum.
        conciliadoEm:
          dados.pagamentoId || dados.receitaId || dados.ignorado ? new Date() : null,
      },
      select: selecao,
    });
    return toDomain(row);
  }

  /**
   * Pagamentos do período **ainda não conciliados**.
   *
   * O `extrato: { none: {} }` é o que impede sugerir duas vezes o mesmo
   * pagamento em importações diferentes — sem ele, o mesmo dinheiro seria
   * conciliado em dois meses seguidos e a conta fecharia por engano.
   */
  async candidatosPagamento(de: string, ate: string): Promise<Candidato[]> {
    const rows = await prisma.pagamento.findMany({
      where: {
        dataPagamento: { gte: parseDataISO(de), lte: parseDataISO(ate) },
        lancamentosExtrato: { none: {} },
      },
      select: { id: true, valor: true, dataPagamento: true },
    });
    return rows.map((r) => ({ id: r.id, valor: Number(r.valor), data: paraDataISO(r.dataPagamento) }));
  }

  async candidatosReceita(de: string, ate: string): Promise<Candidato[]> {
    const rows = await prisma.receita.findMany({
      where: {
        dataRepasse: { gte: parseDataISO(de), lte: parseDataISO(ate) },
        lancamentosExtrato: { none: {} },
      },
      select: { id: true, valor: true, dataRepasse: true },
    });
    return rows
      .filter((r) => r.dataRepasse)
      .map((r) => ({ id: r.id, valor: Number(r.valor), data: paraDataISO(r.dataRepasse!) }));
  }

  async descreverLancamentos(ids: { pagamentos: string[]; receitas: string[] }) {
    const mapa = new Map<string, { descricao: string; valor: number; data: string }>();

    if (ids.pagamentos.length) {
      const rows = await prisma.pagamento.findMany({
        where: { id: { in: ids.pagamentos } },
        select: {
          id: true,
          valor: true,
          dataPagamento: true,
          documentoFiscal: { select: { numero: true, credorNome: true } },
        },
      });
      for (const r of rows) {
        const doc = r.documentoFiscal;
        mapa.set(r.id, {
          // Sem documento é a folha (nº 9999 no envio) — e dizer "Folha de
          // pagamento" é o que permite reconhecê-la no extrato.
          descricao: doc
            ? `Doc. ${doc.numero}${doc.credorNome ? ` — ${doc.credorNome}` : ''}`
            : 'Folha de pagamento',
          valor: Number(r.valor),
          data: paraDataISO(r.dataPagamento),
        });
      }
    }

    if (ids.receitas.length) {
      const rows = await prisma.receita.findMany({
        where: { id: { in: ids.receitas } },
        select: { id: true, valor: true, dataRepasse: true, tipo: true, descricao: true },
      });
      for (const r of rows) {
        mapa.set(r.id, {
          descricao: r.descricao || r.tipo,
          valor: Number(r.valor),
          data: r.dataRepasse ? paraDataISO(r.dataRepasse) : '',
        });
      }
    }

    return mapa;
  }
}

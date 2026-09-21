import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { tenantObrigatorio } from '@/shared/contexto';
import type { IPagamentoRepository } from '@/application/pagamento/IPagamentoRepository';
import type { DadosPagamento } from '@/application/pagamento/dtos';
import type { Pagamento, MeioPagamento } from '@/core/pagamento/Pagamento';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  ajusteId: true,
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
    clienteId: row.clienteId,
    ajusteId: row.ajusteId,
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

  /**
   * Os lançamentos do órgão, do mais recente para o mais antigo.
   *
   * Sem `where`: quem recorta é a extension de tenant. Escrever o filtro aqui
   * sugeriria que ele é opcional numa consulta nova — e é o contrário: consulta
   * sem recorte funciona perfeitamente para quem a escreveu, e para os outros
   * órgãos também.
   */
  async listarDoOrgao() {
    const rows = await prisma.pagamento.findMany({ select: selecao, orderBy: [{ dataPagamento: 'desc' }, { id: 'desc' }] });
    return rows.map(toDomain);
  }

  /**
   * Quanto a nota já tem pago.
   *
   * Agrega no banco em vez de trazer os pagamentos e somar aqui: a pergunta é
   * um número, e a nota parcelada em doze traria doze linhas para respondê-la.
   *
   * O recorte por órgão vem da própria nota: `documentoFiscalId` só chega aqui
   * depois de o caso de uso confirmar que aquela nota é do órgão.
   */
  async somaPagaDaNota(documentoFiscalId: string, ignorarId?: string): Promise<number> {
    const r = await prisma.pagamento.aggregate({
      where: { documentoFiscalId, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      _sum: { valor: true },
    });
    return Number(r._sum.valor ?? 0);
  }

  /** Nasce sem prestação: quem se apropria dele decide isso depois. */
  async criarNoOrgao(dados: Parameters<typeof this.atualizar>[1]) {
    const row = await prisma.pagamento.create({
      data: { ...dados, clienteId: tenantObrigatorio('Pagamento') },
      select: selecao,
    });
    return toDomain(row);
  }


  /**
   * Candidatos: sem prestação, do ajuste (ou sem ajuste), no exercício.
   *
   * O recorte por órgão vem da extension; estes três são regra de negócio e
   * ficam explícitos.
   */
  async listarCandidatos(ajusteId: string, ano: number) {
    const rows = await prisma.pagamento.findMany({
      where: {
        prestacaoId: null,
        OR: [{ ajusteId }, { ajusteId: null }],
        dataPagamento: {
          gte: new Date(Date.UTC(ano, 0, 1)),
          lte: new Date(Date.UTC(ano, 11, 31)),
        },
      },
      select: selecao,
      orderBy: [{ dataPagamento: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDomain);
  }

  /** Carimba a prestação **e** o ajuste: apropriar é decidir a parceria. */
  async apropriar(id: string, prestacaoId: string, ajusteId: string): Promise<void> {
    await prisma.pagamento.update({ where: { id }, data: { prestacaoId, ajusteId } });
  }

  /**
   * Tira da prestação, preservando o ajuste.
   *
   * O ajuste é fato do lançamento — o dinheiro entrou naquela parceria —, e
   * apagá-lo faria o lançamento reaparecer como "sem ajuste" na lista de
   * candidatos de qualquer prestação.
   */
  async desapropriar(id: string): Promise<void> {
    await prisma.pagamento.update({ where: { id }, data: { prestacaoId: null } });
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
    const row = await prisma.pagamento.create({
      data: { prestacaoId, ...dados, clienteId: tenantObrigatorio('Pagamento') },
      select: selecao,
    });
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

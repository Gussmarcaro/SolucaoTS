import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IGuiaRecolhimentoRepository } from '@/application/guiaRecolhimento/IGuiaRecolhimentoRepository';
import type { DadosGuia } from '@/application/guiaRecolhimento/dtos';
import type { GuiaRecolhimento, RetencaoApurada } from '@/core/guiaRecolhimento/GuiaRecolhimento';
import type { TipoRetencao } from '@/core/documentoFiscal/DocumentoFiscal';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  tipo: true,
  ano: true,
  mes: true,
  valor: true,
  dataVencimento: true,
  dataPagamento: true,
  numeroDocumento: true,
  observacao: true,
} satisfies Prisma.GuiaRecolhimentoSelect;

type Row = Prisma.GuiaRecolhimentoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): GuiaRecolhimento {
  return {
    id: row.id,
    clienteId: row.clienteId,
    tipo: row.tipo as TipoRetencao,
    ano: row.ano,
    mes: row.mes,
    valor: Number(row.valor),
    dataVencimento: row.dataVencimento ? paraDataISO(row.dataVencimento) : null,
    dataPagamento: row.dataPagamento ? paraDataISO(row.dataPagamento) : null,
    numeroDocumento: row.numeroDocumento,
    observacao: row.observacao,
  };
}

export class PrismaGuiaRecolhimentoRepository implements IGuiaRecolhimentoRepository {
  /**
   * Apura o retido por tributo e competência, das notas **pagas**.
   *
   * A competência sai da data do **pagamento**, não da emissão: retém-se ao
   * pagar. Nota emitida em março e paga em abril recolhe-se na guia de abril.
   *
   * Quando a nota tem mais de um pagamento, a retenção inteira é atribuída ao
   * **primeiro** — que é quando o tributo passou a ser devido. Ratear a
   * retenção entre parcelas exigiria uma regra que a legislação trata caso a
   * caso, e o pagamento parcelado é raro aqui; atribuir tudo ao primeiro
   * antecipa o recolhimento, que é o lado seguro do erro.
   */
  async apurar(ate: { ano: number; mes: number }): Promise<Omit<RetencaoApurada, 'guia'>[]> {
    const limite = new Date(Date.UTC(ate.ano, ate.mes, 0)); // último dia do mês

    const notas = await prisma.documentoFiscal.findMany({
      where: {
        valorEncargos: { gt: 0 },
        pagamentos: { some: {} },
        // Ou tem o detalhamento, ou tem o tipo antigo. Nota com valor retido e
        // nenhum dos dois não é apurável: não se sabe qual tributo recolher, e
        // chutar seria pior que omitir.
        OR: [{ retencoes: { some: {} } }, { retencaoTipo: { not: null } }],
      },
      select: {
        retencaoTipo: true,
        valorEncargos: true,
        retencoes: { select: { tipo: true, valor: true } },
        pagamentos: { select: { dataPagamento: true }, orderBy: { dataPagamento: 'asc' }, take: 1 },
      },
    });

    const mapa = new Map<string, { tipo: TipoRetencao; ano: number; mes: number; valorApurado: number; notas: number }>();
    for (const n of notas) {
      const primeiro = n.pagamentos[0]?.dataPagamento;
      if (!primeiro || primeiro > limite) continue;

      const ano = primeiro.getUTCFullYear();
      const mes = primeiro.getUTCMonth() + 1;

      /*
       * O detalhamento manda; o campo antigo é a ponte.
       *
       * Uma nota de serviço retém IRRF, PIS, COFINS e CSLL ao mesmo tempo, e
       * cada um vai para a sua guia. Enquanto havia um tipo só, o total inteiro
       * era atribuído a um tributo — e as outras três guias saíam zeradas.
       *
       * Notas gravadas antes da quebra continuam sendo lidas pelo campo antigo,
       * senão elas sumiriam das guias no dia da publicação.
       */
      const partes = n.retencoes.length
        ? n.retencoes.map((r) => ({ tipo: r.tipo as TipoRetencao, valor: Number(r.valor) }))
        : [{ tipo: n.retencaoTipo as TipoRetencao, valor: Number(n.valorEncargos) }];

      for (const parte of partes) {
        const k = `${parte.tipo}-${ano}-${mes}`;
        const atual = mapa.get(k) ?? { tipo: parte.tipo, ano, mes, valorApurado: 0, notas: 0 };
        atual.valorApurado += parte.valor;
        atual.notas += 1;
        mapa.set(k, atual);
      }
    }

    return [...mapa.values()].map((v) => ({
      ...v,
      valorApurado: Math.round(v.valorApurado * 100) / 100,
    }));
  }

  async listarGuias(): Promise<GuiaRecolhimento[]> {
    const rows = await prisma.guiaRecolhimento.findMany({
      select: selecao,
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { tipo: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<GuiaRecolhimento | null> {
    const row = await prisma.guiaRecolhimento.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  /**
   * `findFirst`, e não a chave composta: `clienteId` é nulo enquanto o backfill
   * não roda, e a chave única não alcançaria esses registros. O recorte por
   * órgão vem da extension.
   */
  async buscarPorCompetencia(
    tipo: TipoRetencao,
    ano: number,
    mes: number,
  ): Promise<GuiaRecolhimento | null> {
    const row = await prisma.guiaRecolhimento.findFirst({
      where: { tipo, ano, mes },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosGuia): Promise<GuiaRecolhimento> {
    const row = await prisma.guiaRecolhimento.create({ data: { ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosGuia): Promise<GuiaRecolhimento> {
    const row = await prisma.guiaRecolhimento.update({
      where: { id },
      data: { ...dados },
      select: selecao,
    });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.guiaRecolhimento.delete({ where: { id } });
  }
}

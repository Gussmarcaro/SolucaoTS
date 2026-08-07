import { prisma } from './prisma';
import type { IMontadorRepository } from '@/application/montador/IMontadorRepository';
import type { DadosMontagem } from '@/application/montador/tipos';
import { paraDataISO } from '@/shared/datas';

const dISO = (d: Date | null) => (d ? paraDataISO(d) : null);
const n = (v: unknown) => (v == null ? null : Number(v));
type Periodo = { mes: number; cargaHoraria: number; remuneracaoBruta: number };

export class PrismaMontadorRepository implements IMontadorRepository {
  async carregar(prestacaoId: string): Promise<DadosMontagem | null> {
    const prestacao = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: {
        ano: true,
        mes: true,
        ehRetificacao: true,
        ajuste: {
          select: {
            codigoAjuste: true,
            tipoAjuste: true,
            cliente: { select: { codigoMunicipio: true, codigoEntidade: true } },
          },
        },
      },
    });
    if (!prestacao) return null;

    const [empregados, bens, documentosFiscais, pagamentos, receitas, disponibilidades, descontos, devolucoes, glosas, empenhos, repasses, servidores, atividades] =
      await Promise.all([
        prisma.relacaoEmpregado.findMany({ where: { prestacaoId } }),
        prisma.bemPrestacao.findMany({ where: { prestacaoId } }),
        prisma.documentoFiscal.findMany({ where: { prestacaoId } }),
        prisma.pagamento.findMany({ where: { prestacaoId }, include: { documentoFiscal: { select: { numero: true, credorTipoDoc: true, credorNumeroDoc: true } } } }),
        prisma.receita.findMany({ where: { prestacaoId } }),
        prisma.disponibilidade.findMany({ where: { prestacaoId } }),
        prisma.desconto.findMany({ where: { prestacaoId } }),
        prisma.devolucao.findMany({ where: { prestacaoId } }),
        prisma.glosa.findMany({ where: { prestacaoId }, include: { documentoFiscal: { select: { numero: true, credorTipoDoc: true, credorNumeroDoc: true } } } }),
        prisma.empenhoPrestacao.findMany({ where: { prestacaoId } }),
        prisma.repassePrestacao.findMany({ where: { prestacaoId }, include: { empenho: { select: { numero: true, dataEmissao: true } } } }),
        prisma.servidorCedido.findMany({ where: { prestacaoId } }),
        prisma.relatorioAtividadeMeta.findMany({ where: { prestacaoId } }),
      ]);

    return {
      ano: prestacao.ano,
      mes: prestacao.mes,
      ehRetificacao: prestacao.ehRetificacao,
      tipoAjuste: prestacao.ajuste?.tipoAjuste ?? '',
      codigoAjuste: prestacao.ajuste?.codigoAjuste ?? '',
      municipio: prestacao.ajuste?.cliente?.codigoMunicipio ?? null,
      entidade: prestacao.ajuste?.cliente?.codigoEntidade ?? null,

      empregados: empregados.map((e) => ({
        cpf: e.cpf,
        dataAdmissao: paraDataISO(e.dataAdmissao),
        dataDemissao: dISO(e.dataDemissao),
        cbo: e.cbo,
        cns: e.cns,
        salarioContratual: Number(e.salarioContratual),
        periodos: (e.periodos as unknown as Periodo[]) ?? [],
      })),

      bens: bens.map((b) => ({
        categoria: b.categoria,
        numeroPatrimonio: b.numeroPatrimonio,
        descricao: b.descricao,
        data: paraDataISO(b.data),
        valor: n(b.valor),
      })),

      documentosFiscais: documentosFiscais.map((f) => ({
        numero: f.numero,
        credorTipoDoc: f.credorTipoDoc,
        credorNumeroDoc: f.credorNumeroDoc,
        credorNome: f.credorNome,
        descricao: f.descricao,
        dataEmissao: paraDataISO(f.dataEmissao),
        estadoEmissor: f.estadoEmissor,
        valorBruto: Number(f.valorBruto),
        valorEncargos: Number(f.valorEncargos),
        categoriaDespesaTipo: f.categoriaDespesaTipo,
        rateioProveniente: f.rateioProveniente,
        rateioPercentual: n(f.rateioPercentual),
      })),

      pagamentos: pagamentos.map((p) => ({
        folha: p.documentoFiscalId == null,
        docNumero: p.documentoFiscal?.numero ?? null,
        docCredorTipo: p.documentoFiscal?.credorTipoDoc ?? null,
        docCredorNumero: p.documentoFiscal?.credorNumeroDoc ?? null,
        dataPagamento: paraDataISO(p.dataPagamento),
        valor: Number(p.valor),
        fonteRecursoTipo: p.fonteRecursoTipo,
        meioPagamento: p.meioPagamento,
        banco: p.banco,
        agencia: p.agencia,
        contaCorrente: p.contaCorrente,
        numeroTransacao: p.numeroTransacao,
      })),

      receitas: receitas.map((r) => ({
        tipo: r.tipo,
        descricao: r.descricao,
        dataPrevista: dISO(r.dataPrevista),
        dataRepasse: dISO(r.dataRepasse),
        fonteRecursoTipo: r.fonteRecursoTipo,
        valor: Number(r.valor),
      })),

      disponibilidades: disponibilidades.map((x) => ({
        banco: x.banco,
        agencia: x.agencia,
        conta: x.conta,
        contaTipo: x.contaTipo,
        saldoBancario: Number(x.saldoBancario),
        saldoContabil: Number(x.saldoContabil),
      })),

      descontos: descontos.map((x) => ({ data: paraDataISO(x.data), descricao: x.descricao, valor: Number(x.valor) })),
      devolucoes: devolucoes.map((x) => ({ data: paraDataISO(x.data), naturezaDevolucaoTipo: x.naturezaDevolucaoTipo, valor: Number(x.valor) })),

      glosas: glosas.map((g) => ({
        docNumero: g.documentoFiscal?.numero ?? null,
        docCredorTipo: g.documentoFiscal?.credorTipoDoc ?? null,
        docCredorNumero: g.documentoFiscal?.credorNumeroDoc ?? null,
        pagamentoData: dISO(g.pagamentoData),
        resultadoAnalise: g.resultadoAnalise,
        valorGlosa: n(g.valorGlosa),
      })),

      empenhos: empenhos.map((e) => ({
        numero: e.numero,
        dataEmissao: paraDataISO(e.dataEmissao),
        classificacaoEconomica: e.classificacaoEconomica,
        fonteRecursoTipo: e.fonteRecursoTipo,
        valor: Number(e.valor),
        historico: e.historico,
        cpfOrdenadorDespesa: e.cpfOrdenadorDespesa,
      })),

      repasses: repasses.map((r) => ({
        empenhoNumero: r.empenho?.numero ?? null,
        empenhoDataEmissao: r.empenho ? paraDataISO(r.empenho.dataEmissao) : null,
        dataPrevista: paraDataISO(r.dataPrevista),
        dataRepasse: paraDataISO(r.dataRepasse),
        valorPrevisto: Number(r.valorPrevisto),
        valorRepasse: Number(r.valorRepasse),
        justificativaDiferenca: r.justificativaDiferenca,
        tipoDocumentoBancario: r.tipoDocumentoBancario,
        descricaoOutros: r.descricaoOutros,
        numeroDocumento: r.numeroDocumento,
        banco: r.banco,
        agencia: r.agencia,
        conta: r.conta,
      })),

      servidores: servidores.map((s) => ({
        cpf: s.cpf,
        dataInicialCessao: paraDataISO(s.dataInicialCessao),
        dataFinalCessao: dISO(s.dataFinalCessao),
        cargoPublico: s.cargoPublico,
        funcaoEntidade: s.funcaoEntidade,
        onusPagamento: s.onusPagamento,
        periodos: (s.periodos as unknown as Periodo[]) ?? [],
      })),

      atividades: atividades.map((a) => ({
        nomePrograma: a.nomePrograma,
        codigoMeta: a.codigoMeta,
        periodo: a.periodo,
        quantidadeRealizada: n(a.quantidadeRealizada),
        resultadoMeta: a.resultadoMeta,
        justificativaPeriodo: a.justificativaPeriodo,
        metaAtendida: a.metaAtendida,
        justificativaMeta: a.justificativaMeta,
      })),
    };
  }
}

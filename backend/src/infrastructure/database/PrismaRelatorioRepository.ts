import { prisma } from './prisma';
import type {
  FiltroRelatorio,
  IRelatorioRepository,
  LinhaExecucao,
  LinhaRepasse,
  ResumoSituacao,
} from '@/application/relatorio/RelatorioUseCases';
import { paraDataISO } from '@/shared/datas';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/**
 * Consultas dos relatórios.
 *
 * **Cuidado central deste arquivo:** os blocos da prestação (`RepassePrestacao`,
 * `Pagamento`) **não** são raízes de tenant — eles alcançam o órgão pelo pai, e
 * a extension não os filtra. Uma agregação direta sobre eles somaria os valores
 * de todos os órgãos num relatório só.
 *
 * Por isso todas as consultas aqui partem das **prestações** (que descendem de
 * `Ajuste`, essa sim filtrada) e depois restringem os blocos aos ids obtidos.
 * É o primeiro lugar do sistema onde o limite documentado do filtro por raiz
 * sai do papel — e onde ignorá-lo daria um relatório errado sem erro nenhum.
 */
export class PrismaRelatorioRepository implements IRelatorioRepository {
  /** Prestações que o órgão em contexto alcança, já com o ajuste resolvido. */
  private async prestacoesDoContexto(filtro: FiltroRelatorio) {
    return prisma.prestacaoContas.findMany({
      where: {
        ajusteId: filtro.ajusteId,
        ano: filtro.ano,
        // O `ajuste` é raiz de tenant: exigir a relação faz o recorte descer.
        ajuste: { is: {} },
      },
      select: {
        id: true,
        ano: true,
        status: true,
        ajusteId: true,
        ajuste: {
          select: {
            id: true,
            codigoAjuste: true,
            numero: true,
            tipoAjuste: true,
            valorGlobal: true,
            dataAssinatura: true,
            entidadeBeneficiaria: { select: { razaoSocial: true } },
          },
        },
      },
    });
  }

  async execucao(filtro: FiltroRelatorio): Promise<LinhaExecucao[]> {
    const prestacoes = await this.prestacoesDoContexto(filtro);
    const ids = prestacoes.map((p) => p.id);

    // Os ajustes vêm da consulta própria (e não das prestações) para que o
    // relatório mostre também os que ainda não têm prestação nenhuma — que são
    // justamente os de execução zero, os mais importantes de ver.
    const ajustes = await prisma.ajuste.findMany({
      where: { id: filtro.ajusteId },
      select: {
        id: true,
        codigoAjuste: true,
        numero: true,
        tipoAjuste: true,
        valorGlobal: true,
        entidadeBeneficiaria: { select: { razaoSocial: true } },
      },
    });

    const [repasses, pagamentos] = await Promise.all([
      ids.length
        ? prisma.repassePrestacao.groupBy({
            by: ['prestacaoId'],
            where: { prestacaoId: { in: ids } },
            _sum: { valorRepasse: true },
          })
        : [],
      ids.length
        ? prisma.pagamento.groupBy({
            by: ['prestacaoId'],
            where: { prestacaoId: { in: ids } },
            _sum: { valor: true },
          })
        : [],
    ]);

    const porPrestacao = new Map(prestacoes.map((p) => [p.id, p.ajusteId]));
    const somar = (
      linhas: { prestacaoId: string; _sum: Record<string, unknown> }[],
      campo: string,
    ) => {
      const acc = new Map<string, number>();
      for (const l of linhas) {
        const ajusteId = porPrestacao.get(l.prestacaoId);
        if (!ajusteId) continue;
        acc.set(ajusteId, (acc.get(ajusteId) ?? 0) + num(l._sum[campo]));
      }
      return acc;
    };

    const repassadoPor = somar(repasses, 'valorRepasse');
    const pagoPor = somar(pagamentos, 'valor');
    const qtdPrestacoes = new Map<string, number>();
    for (const p of prestacoes) qtdPrestacoes.set(p.ajusteId, (qtdPrestacoes.get(p.ajusteId) ?? 0) + 1);

    return ajustes.map((a) => {
      const valorGlobal = num(a.valorGlobal);
      const repassado = repassadoPor.get(a.id) ?? 0;
      const pago = pagoPor.get(a.id) ?? 0;
      return {
        ajusteId: a.id,
        codigoAjuste: a.codigoAjuste,
        numero: a.numero,
        tipoAjuste: a.tipoAjuste,
        entidadeNome: a.entidadeBeneficiaria.razaoSocial,
        valorGlobal,
        repassado,
        pago,
        emPoderDaEntidade: repassado - pago,
        aRepassar: valorGlobal - repassado,
        // Sem valor global não há percentual a calcular — `null` em vez de
        // divisão por zero virando Infinity na tela.
        execucao: valorGlobal > 0 ? repassado / valorGlobal : null,
        prestacoes: qtdPrestacoes.get(a.id) ?? 0,
      };
    });
  }

  async repasses(filtro: FiltroRelatorio): Promise<LinhaRepasse[]> {
    const prestacoes = await this.prestacoesDoContexto(filtro);
    const ids = prestacoes.map((p) => p.id);
    if (!ids.length) return [];

    const linhas = await prisma.repassePrestacao.findMany({
      where: { prestacaoId: { in: ids } },
      select: {
        prestacaoId: true,
        dataPrevista: true,
        dataRepasse: true,
        valorPrevisto: true,
        valorRepasse: true,
        justificativaDiferenca: true,
      },
    });

    const contexto = new Map(prestacoes.map((p) => [p.id, p]));
    const umDia = 24 * 60 * 60 * 1000;

    return linhas.flatMap((l): LinhaRepasse[] => {
      const p = contexto.get(l.prestacaoId);
      if (!p?.ajuste) return [];
      return [
        {
          ajusteId: p.ajuste.id,
          codigoAjuste: p.ajuste.codigoAjuste,
          entidadeNome: p.ajuste.entidadeBeneficiaria.razaoSocial,
          ano: p.ano,
          dataPrevista: paraDataISO(l.dataPrevista),
          dataRepasse: paraDataISO(l.dataRepasse),
          valorPrevisto: num(l.valorPrevisto),
          valorRepasse: num(l.valorRepasse),
          atrasoDias: Math.round((l.dataRepasse.getTime() - l.dataPrevista.getTime()) / umDia),
          diferencaValor: num(l.valorRepasse) - num(l.valorPrevisto),
          justificativa: l.justificativaDiferenca,
        },
      ];
    });
  }

  async situacao(filtro: FiltroRelatorio): Promise<ResumoSituacao> {
    const prestacoes = await this.prestacoesDoContexto(filtro);

    const chave = (ano: number, status: string) => `${ano}|${status}`;
    const mapa = new Map<string, { ano: number; status: string; quantidade: number; valorGlobal: number }>();
    for (const p of prestacoes) {
      const k = chave(p.ano, p.status);
      const atual = mapa.get(k) ?? { ano: p.ano, status: p.status, quantidade: 0, valorGlobal: 0 };
      atual.quantidade += 1;
      atual.valorGlobal += num(p.ajuste?.valorGlobal);
      mapa.set(k, atual);
    }

    const comPrestacao = new Set(prestacoes.map((p) => p.ajusteId));
    const ajustes = await prisma.ajuste.findMany({
      where: { id: filtro.ajusteId },
      select: {
        id: true,
        codigoAjuste: true,
        dataAssinatura: true,
        entidadeBeneficiaria: { select: { razaoSocial: true } },
      },
      orderBy: { dataAssinatura: 'desc' },
    });

    return {
      linhas: [...mapa.values()].sort((a, b) => b.ano - a.ano || a.status.localeCompare(b.status)),
      ajustesSemPrestacao: ajustes
        .filter((a) => !comPrestacao.has(a.id))
        .map((a) => ({
          ajusteId: a.id,
          codigoAjuste: a.codigoAjuste,
          entidadeNome: a.entidadeBeneficiaria.razaoSocial,
          dataAssinatura: paraDataISO(a.dataAssinatura),
        })),
    };
  }
}

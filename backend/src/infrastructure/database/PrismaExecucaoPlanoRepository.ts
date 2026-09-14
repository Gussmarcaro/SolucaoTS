import { prisma } from './prisma';
import type { IExecucaoPlanoRepository } from '@/application/execucaoPlano/IExecucaoPlanoRepository';

export class PrismaExecucaoPlanoRepository implements IExecucaoPlanoRepository {
  async planejadoPorCategoria(ajusteId: string, ano: number) {
    const linhas = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId, ano, categoriaDespesaTipo: { not: null } },
      select: { categoriaDespesaTipo: true, categoria: true, subcategoria: true, valor: true },
    });

    const mapa = new Map<number, { rubricas: Set<string>; valor: number }>();
    for (const l of linhas) {
      const cat = l.categoriaDespesaTipo!;
      const atual = mapa.get(cat) ?? { rubricas: new Set<string>(), valor: 0 };
      atual.rubricas.add(`${l.categoria} / ${l.subcategoria}`);
      // Soma o ano inteiro: as 12 competências da rubrica viram o planejado
      // anual, que é a comparação que interessa.
      atual.valor += Number(l.valor);
      mapa.set(cat, atual);
    }

    return [...mapa.entries()].map(([categoriaDespesaTipo, v]) => ({
      categoriaDespesaTipo,
      rubricas: [...v.rubricas].sort(),
      valor: v.valor,
    }));
  }

  async executadoPorCategoria(ajusteId: string, ano: number) {
    /*
     * As notas chegam pelas prestações do ajuste.
     *
     * Duas coisas ficam de fora, e as duas de propósito:
     *
     * - nota lançada em Financeiro → Despesas e **ainda não apropriada** por
     *   nenhuma prestação. Ela não pertence a ajuste nenhum até que alguém
     *   diga que pertence; contá-la aqui seria atribuir gasto por adivinhação;
     * - o recorte por órgão, que a extension de tenant aplica sozinha — a
     *   prestação é raiz filtrada, e a nota também.
     */
    const notas = await prisma.documentoFiscal.findMany({
      where: {
        prestacao: { ajusteId, ano },
        // Sem categoria não há como classificar; e ela é obrigatória na nota,
        // então isto só alcança dado anterior à regra.
        categoriaDespesaTipo: { gt: 0 },
      },
      select: {
        categoriaDespesaTipo: true,
        valorBruto: true,
        rateioProveniente: true,
        rateioPercentual: true,
      },
    });

    const mapa = new Map<number, number>();
    for (const n of notas) {
      /*
       * A nota rateada entra pela **parcela deste ajuste**.
       *
       * Sem isso a conta de luz dividida entre cinco ajustes apareceria inteira
       * em cada um, e o quadro acusaria estouro em todos eles — um alarme falso
       * que faria o usuário parar de confiar no painel.
       *
       * Percentual ausente numa nota marcada como rateada seria dado
       * incompleto; conta-se cheia, que é o pior caso, em vez de descartá-la
       * em silêncio.
       */
      const pct =
        n.rateioProveniente && n.rateioPercentual != null ? Number(n.rateioPercentual) / 100 : 1;
      const valor = Number(n.valorBruto) * pct;
      mapa.set(n.categoriaDespesaTipo, (mapa.get(n.categoriaDespesaTipo) ?? 0) + valor);
    }

    return [...mapa.entries()].map(([categoriaDespesaTipo, valor]) => ({
      categoriaDespesaTipo,
      // Duas casas: a soma de percentuais produz dízima, e o quadro compara com
      // um planejado que é sempre exato.
      valor: Math.round(valor * 100) / 100,
    }));
  }
}

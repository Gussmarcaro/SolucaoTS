import { prisma } from './prisma';
import type {
  FiltroRelatorio,
  IRelatorioRepository,
  LinhaExecucao,
  LinhaRepasse,
  ResumoSituacao,
  FiltroPeriodo,
  NotaCrua,
  ReceitasPorTipo,
} from '@/application/relatorio/RelatorioUseCases';
import { paraDataISO, parseDataISO } from '@/shared/datas';
import { ratearValor } from '@/core/rateio/Rateio';

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
    /*
     * `prestacaoId` é opcional desde que o lançamento passou a ser do órgão: o
     * pagamento existe antes de qualquer prestação se apropriar dele.
     *
     * Linha sem prestação é **ignorada aqui de propósito** — este relatório
     * mede execução por ajuste através da prestação, e um lançamento ainda não
     * apropriado não pertence a nenhuma. O `continue` que já existia para
     * prestação desconhecida cobre os dois casos.
     */
    const somar = (
      linhas: { prestacaoId: string | null; _sum: Record<string, unknown> }[],
      campo: string,
    ) => {
      const acc = new Map<string, number>();
      for (const l of linhas) {
        const ajusteId = l.prestacaoId ? porPrestacao.get(l.prestacaoId) : undefined;
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

  /**
   * Despesa somada por credor.
   *
   * Parte das **prestações** e restringe as notas às ligações delas, como o
   * resto deste arquivo — e aqui há um motivo a mais. `DocumentoFiscal` é raiz
   * de tenant e a extension o filtraria sozinha, mas a nota é **do órgão**:
   * ela existe antes de ser apropriada a qualquer prestação. Somar direto
   * traria despesa que ainda não pertence a parceria nenhuma, e o filtro por
   * ajuste simplesmente não teria por onde ser aplicado.
   *
   * O somatório é feito em memória, e não por `groupBy`, porque a chave é o
   * par tipo+número do credor e o caminho até o ajuste passa por duas
   * relações. O volume é o de um exercício de um órgão — centenas de linhas,
   * não milhões.
   */
  async fornecedores(filtro: FiltroRelatorio) {
    const prestacoes = await this.prestacoesDoContexto(filtro);
    const ids = prestacoes.map((p) => p.id);
    if (!ids.length) return [];

    const ligacoes = await prisma.prestacaoDocumentoFiscal.findMany({
      where: { prestacaoId: { in: ids } },
      select: {
        // O percentual do rateio é da **ligação**, não da nota: a mesma nota
        // alimenta várias prestações com fatias diferentes. Somar o valor
        // cheio em todas contaria a despesa mais de uma vez.
        percentual: true,
        documentoFiscal: {
          select: {
            credorTipoDoc: true,
            credorNumeroDoc: true,
            credorNome: true,
            valorBruto: true,
          },
        },
      },
    });

    const mapa = new Map<
      string,
      { credorTipoDoc: string; credorNumeroDoc: string; credorNome: string | null; notas: number; valor: number }
    >();

    for (const l of ligacoes) {
      const f = l.documentoFiscal;
      if (!f) continue;
      const chave = `${f.credorTipoDoc}|${f.credorNumeroDoc}`;
      const atual = mapa.get(chave) ?? {
        credorTipoDoc: String(f.credorTipoDoc),
        credorNumeroDoc: f.credorNumeroDoc,
        credorNome: f.credorNome,
        notas: 0,
        valor: 0,
      };
      // `percentual` é 100 na nota comum e a fatia do ajuste na rateada.
      const fatia = num(l.percentual) || 100;
      atual.notas += 1;
      atual.valor += (num(f.valorBruto) * fatia) / 100;
      // O nome pode faltar numa nota e existir noutra do mesmo credor —
      // preferir o que existe evita a linha "(sem nome)" para quem tem nome.
      atual.credorNome = atual.credorNome ?? f.credorNome;
      mapa.set(chave, atual);
    }

    return [...mapa.values()];
  }

  /**
   * As notas que o período alcança, com os pagamentos de cada uma.
   *
   * **Parte do `DocumentoFiscal`, não da prestação** — e é a diferença que
   * define este relatório. Os demais olham o que alguma prestação já
   * apropriou; este é operacional: a nota lançada ontem precisa aparecer no
   * fechamento de hoje, muito antes de existir prestação.
   *
   * Três cuidados:
   *
   * 1. **Os dois braços da nota rateada**, como na tela de Despesas: a nota
   *    lançada *para* o ajuste e a rateada cujo quadro *o inclui*. Sem o
   *    segundo, a despesa da sede sumiria de todas as parcerias.
   * 2. **A parcela, não o valor cheio.** Dentro de um ajuste, a nota rateada
   *    entra pela fatia dele — somar a nota inteira em cada parceria contaria
   *    a mesma despesa duas vezes.
   * 3. **O pagamento é recortado pelo ajuste junto com a nota.** Na rateada,
   *    cada parceria paga a sua parte, e trazer os pagamentos das outras
   *    inflaria o desembolso do período.
   */
  async notasDoPeriodo(filtro: FiltroPeriodo): Promise<NotaCrua[]> {
    const de = parseDataISO(filtro.de);
    const ate = parseDataISO(filtro.ate);
    const { ajusteId } = filtro;

    const doAjuste = ajusteId
      ? [{ ajusteId }, { rateioProveniente: true, rateio: { participantes: { some: { ajusteId } } } }]
      : undefined;

    const rows = await prisma.documentoFiscal.findMany({
      where: {
        ...(doAjuste ? { OR: doAjuste } : {}),
        // Emitida no período **ou** paga nele: a nota de dezembro quitada em
        // janeiro é despesa de dezembro e desembolso de janeiro.
        AND: [
          {
            OR: [
              { dataEmissao: { gte: de, lte: ate } },
              { pagamentos: { some: { dataPagamento: { gte: de, lte: ate } } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        dataEmissao: true,
        tipoDocumento: true,
        numero: true,
        descricao: true,
        credorNome: true,
        credorTipoDoc: true,
        credorNumeroDoc: true,
        categoriaDespesaTipo: true,
        propostaCategoria: true,
        propostaSubcategoria: true,
        valorBruto: true,
        rateioProveniente: true,
        rateio: { select: { participantes: { select: { ajusteId: true, base: true } } } },
        pagamentos: {
          // Na rateada, só os pagamentos desta parceria — ver o cuidado 3.
          where: ajusteId ? { ajusteId } : undefined,
          select: {
            dataPagamento: true,
            valor: true,
            // O identificador do banco vem da linha de extrato conciliada: é
            // o "código do pagamento do extrato" que o quadro de comprovantes
            // pede, e ele só existe porque a conciliação foi feita.
            lancamentosExtrato: { select: { fitId: true }, take: 1 },
          },
          orderBy: { dataPagamento: 'asc' },
        },
      },
      orderBy: [{ dataEmissao: 'asc' }, { numero: 'asc' }],
    });

    return rows.map((r) => {
      const cheio = num(r.valorBruto);
      /*
       * A parcela sai do **mesmo** `ratearValor` do lançamento e do teto do
       * pagamento. Uma segunda conta para o mesmo valor divergiria no centavo
       * do maior resto, e a diferença apareceria como um relatório que não
       * fecha com o que foi pago.
       */
      const participantes = r.rateio?.participantes ?? [];
      const valorContabil =
        ajusteId && r.rateioProveniente && participantes.length
          ? (ratearValor(cheio, participantes.map((p) => ({ ajusteId: p.ajusteId, base: num(p.base) })))
              .find((x) => x.ajusteId === ajusteId)?.valor ?? 0)
          : cheio;

      return {
        id: r.id,
        dataEmissao: paraDataISO(r.dataEmissao),
        tipoDocumento: r.tipoDocumento ?? null,
        numero: r.numero,
        descricao: r.descricao,
        credorNome: r.credorNome,
        credorTipoDoc: String(r.credorTipoDoc),
        credorNumeroDoc: r.credorNumeroDoc,
        categoriaDespesaTipo: r.categoriaDespesaTipo,
        propostaCategoria: r.propostaCategoria,
        propostaSubcategoria: r.propostaSubcategoria,
        valorContabil,
        pagamentos: r.pagamentos.map((p) => ({
          data: paraDataISO(p.dataPagamento),
          valor: num(p.valor),
          codigoExtrato: p.lancamentosExtrato[0]?.fitId ?? null,
        })),
      };
    });
  }

  /**
   * As receitas recebidas no período, somadas por tipo.
   *
   * Pela **data do repasse**, não pela prevista: o resumo responde "quanto
   * entrou", e o previsto que não entrou não é dinheiro disponível.
   */
  async receitasDoPeriodo(filtro: FiltroPeriodo): Promise<ReceitasPorTipo[]> {
    const rows = await prisma.receita.groupBy({
      by: ['tipo'],
      where: {
        ...(filtro.ajusteId ? { ajusteId: filtro.ajusteId } : {}),
        dataRepasse: { gte: parseDataISO(filtro.de), lte: parseDataISO(filtro.ate) },
      },
      _sum: { valor: true },
    });
    return rows.map((r) => ({ tipo: r.tipo, valor: num(r._sum.valor) }));
  }
}

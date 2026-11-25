import { prisma } from './prisma';
import { paraDataISO } from '@/shared/datas';
import { ratearValor } from '@/core/rateio/Rateio';
import { cpfFormatado } from '@/core/documento/folha';
import {
  esferaDaFonte,
  linhaDaDespesa,
  VOCABULARIO_DEMONSTRATIVO,
  type DadosDemonstrativo,
  type Esfera,
  type TipoAjusteDemonstrativo,
} from '@/core/documento/demonstrativoIntegral';

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const iso = (d: Date | null | undefined) => (d ? paraDataISO(d) : null);
const br = (d: string | null) => (d ? d.split('-').reverse().join('/') : null);

/**
 * De onde sai cada número do Demonstrativo Integral.
 *
 * ## As fontes, e por que estas
 *
 * - **Repasses** — o bloco Repasses da **prestação**, e não o Financeiro. É o
 *   que vai ao TCESP no documento transmitido: o anexo assinado e o JSON têm de
 *   dizer a mesma coisa, ou a divergência aparece justamente onde o Tribunal
 *   compara. A fonte de cada parcela vem do empenho ligado a ela.
 * - **Receitas** (rendimentos, outras, recursos próprios) — o Financeiro do
 *   ajuste no exercício, pela data de recebimento.
 * - **Despesas** — as notas do ajuste que o exercício alcança (emitidas ou
 *   pagas nele), com a parcela do rateio, como no relatório de despesas. A
 *   folha ordinária, que é pagamento sem nota, entra como RH (5).
 * - **Devoluções** — o bloco Devoluções da prestação.
 * - **Saldo anterior (A)** — as Disponibilidades da prestação do ano anterior,
 *   conta a conta: o saldo bancário que a própria entidade declarou ao fechar
 *   aquele exercício. A esfera de cada conta vem da fonte dela no cadastro do
 *   ajuste.
 *
 * `RepassePrestacao`, `Devolucao` e `Disponibilidade` não são raízes de tenant:
 * todas as consultas partem do `prestacaoId` já conferido contra a prestação,
 * que é. Não há como alcançar dado de outro órgão por aqui.
 */
export class PrismaDemonstrativoRepository {
  async dados(
    prestacaoId: string,
    saldoInformado: Partial<Record<Esfera, number>> | null,
  ): Promise<DadosDemonstrativo | null> {
    const prestacao = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: {
        ano: true,
        ajusteId: true,
        ajuste: {
          select: {
            tipoAjuste: true,
            numero: true,
            codigoAjuste: true,
            objeto: true,
            valorGlobal: true,
            dataAssinatura: true,
            vigenciaInicial: true,
            vigenciaFinal: true,
            fontesRecurso: { select: { fonteRecursoTipo: true } },
            contasBancarias: { select: { banco: true, agencia: true, conta: true, fonteRecursoTipo: true } },
            termosAditivos: {
              select: { numero: true, dataAssinatura: true, valorAcrescido: true, valorSuprimido: true, novaVigenciaFinal: true },
              orderBy: { dataAssinatura: 'asc' },
            },
            cliente: { select: { nome: true, codigoMunicipio: true } },
            entidadeBeneficiaria: {
              select: {
                razaoSocial: true,
                cnpj: true,
                logradouro: true,
                numero: true,
                complemento: true,
                bairro: true,
                cidade: true,
                uf: true,
                cep: true,
                // O presidente em exercício, pela mesma regra do Termo de Ciência.
                membrosDiretoria: {
                  where: { cargo: { contains: 'presiden', mode: 'insensitive' }, dataSaida: null },
                  select: { nome: true, cargo: true, cpf: true },
                  orderBy: { dataEntrada: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!prestacao) return null;

    const { ano, ajusteId, ajuste } = prestacao;
    const de = new Date(Date.UTC(ano, 0, 1));
    const ate = new Date(Date.UTC(ano, 11, 31));
    const tipo = ajuste.tipoAjuste as TipoAjusteDemonstrativo;
    const vocab = VOCABULARIO_DEMONSTRATIVO[tipo];
    const esferasDoAjuste = [...new Set(ajuste.fontesRecurso.map((f) => esferaDaFonte(f.fonteRecursoTipo)))];

    const [repasses, receitas, notas, folha, devolucoes, municipio] = await Promise.all([
      prisma.repassePrestacao.findMany({
        where: { prestacaoId },
        select: {
          dataPrevista: true,
          valorPrevisto: true,
          dataRepasse: true,
          numeroDocumento: true,
          valorRepasse: true,
          empenho: { select: { fonteRecursoTipo: true } },
        },
      }),
      prisma.receita.findMany({
        where: { OR: [{ ajusteId }, { prestacaoId }], dataRepasse: { gte: de, lte: ate } },
        select: { tipo: true, fonteRecursoTipo: true, valor: true },
      }),
      prisma.documentoFiscal.findMany({
        where: {
          OR: [{ ajusteId }, { rateioProveniente: true, rateio: { participantes: { some: { ajusteId } } } }],
          AND: [
            {
              OR: [
                { dataEmissao: { gte: de, lte: ate } },
                { pagamentos: { some: { ajusteId, dataPagamento: { gte: de, lte: ate } } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          dataEmissao: true,
          valorBruto: true,
          folhaPagamento: true,
          propostaCategoria: true,
          categoriaDespesaTipo: true,
          rateioProveniente: true,
          rateio: { select: { participantes: { select: { ajusteId: true, base: true } } } },
          pagamentos: {
            // Na nota rateada, só o que esta parceria pagou.
            where: { ajusteId },
            select: { dataPagamento: true, valor: true, fonteRecursoTipo: true },
          },
        },
      }),
      // Folha ordinária: pagamento sem nota (o "9999" do envio).
      prisma.pagamento.findMany({
        where: { ajusteId, documentoFiscalId: null, dataPagamento: { gte: de, lte: ate } },
        select: { id: true, dataPagamento: true, valor: true, fonteRecursoTipo: true },
      }),
      prisma.devolucao.findMany({
        where: { prestacaoId, data: { gte: de, lte: ate } },
        select: { valor: true },
      }),
      prisma.entidadeAudesp.findFirst({
        where: { codigoMunicipio: ajuste.cliente.codigoMunicipio },
        select: { nomeMunicipio: true },
      }),
    ]);

    const saldoAnterior = await this.saldoAnterior(
      ajusteId,
      ano,
      ajuste.contasBancarias,
      esferasDoAjuste,
      iso(ajuste.vigenciaInicial ?? ajuste.dataAssinatura),
      saldoInformado,
    );

    const e = ajuste.entidadeBeneficiaria;
    const presidente = e.membrosDiretoria[0];
    const cep = e.cep ? `${e.cep.slice(0, 5)}-${e.cep.slice(5)}` : null;
    const endereco = [
      [e.logradouro, e.numero].filter(Boolean).join(', '),
      e.complemento,
      e.bairro,
      [e.cidade, e.uf].filter(Boolean).join('/'),
      cep ? `CEP ${cep}` : null,
    ]
      .filter(Boolean)
      .join(' — ');

    const vigencia = (ini: string | null, fim: string | null) =>
      ini || fim ? `${br(ini) ?? '…'} a ${br(fim) ?? '…'}` : null;

    return {
      tipoAjuste: tipo,
      exercicio: ano,
      orgaoNome: ajuste.cliente.nome,
      municipio: municipio?.nomeMunicipio ?? null,
      entidade: { nome: e.razaoSocial, cnpj: e.cnpj, endereco: endereco || null },
      responsavel: presidente
        ? { nome: presidente.nome, cargo: presidente.cargo, cpf: cpfFormatado(presidente.cpf) }
        : { nome: null, cargo: null, cpf: null },
      objeto: ajuste.objeto,
      instrumentos: [
        {
          documento: `${vocab.instrumento} ${ajuste.numero?.trim() || ajuste.codigoAjuste}`,
          data: iso(ajuste.dataAssinatura),
          vigencia: vigencia(iso(ajuste.vigenciaInicial), iso(ajuste.vigenciaFinal)),
          valor: num(ajuste.valorGlobal),
        },
        ...ajuste.termosAditivos.map((t) => {
          const delta = num(t.valorAcrescido) - num(t.valorSuprimido);
          return {
            documento: `Aditamento nº ${t.numero}`,
            data: iso(t.dataAssinatura),
            vigencia: t.novaVigenciaFinal ? `até ${br(iso(t.novaVigenciaFinal))}` : null,
            valor: t.valorAcrescido == null && t.valorSuprimido == null ? null : delta,
          };
        }),
      ],
      esferasDoAjuste,
      repasses: repasses.map((r) => ({
        dataPrevista: iso(r.dataPrevista),
        valorPrevisto: num(r.valorPrevisto),
        dataRepasse: iso(r.dataRepasse),
        numeroDocumento: r.numeroDocumento,
        valorRepasse: num(r.valorRepasse),
        fonte: r.empenho?.fonteRecursoTipo ?? null,
      })),
      receitas: receitas.map((r) => ({ tipo: r.tipo, fonte: r.fonteRecursoTipo, valor: num(r.valor) })),
      saldoAnterior,
      notas: [
        ...notas.map((n) => {
          const cheio = num(n.valorBruto);
          const participantes = n.rateio?.participantes ?? [];
          // A parcela sai do mesmo `ratearValor` do lançamento: uma segunda
          // conta divergiria no centavo do maior resto.
          const valorContabil =
            n.rateioProveniente && participantes.length
              ? (ratearValor(cheio, participantes.map((p) => ({ ajusteId: p.ajusteId, base: num(p.base) }))).find(
                  (x) => x.ajusteId === ajusteId,
                )?.valor ?? 0)
              : cheio;
          return {
            id: n.id,
            dataEmissao: paraDataISO(n.dataEmissao),
            valorContabil,
            linha: linhaDaDespesa({
              folha: n.folhaPagamento,
              propostaCategoria: n.propostaCategoria,
              categoriaDespesaTipo: n.categoriaDespesaTipo,
            }),
            pagamentos: n.pagamentos.map((p) => ({
              data: paraDataISO(p.dataPagamento),
              valor: num(p.valor),
              fonte: p.fonteRecursoTipo,
            })),
          };
        }),
        ...folha.map((p) => ({
          id: `folha:${p.id}`,
          dataEmissao: paraDataISO(p.dataPagamento),
          valorContabil: num(p.valor),
          linha: 'RH_PESSOAL' as const,
          pagamentos: [{ data: paraDataISO(p.dataPagamento), valor: num(p.valor), fonte: p.fonteRecursoTipo }],
        })),
      ],
      devolucoes: devolucoes.map((x) => ({ valor: num(x.valor) })),
    };
  }

  /**
   * O saldo (A), por esfera.
   *
   * Três casos, e só um deles pede atenção de quem assina:
   *
   * - **Informado na tela** — vale o que se digitou. É a saída para a parceria
   *   que tem movimento anterior ao sistema.
   * - **Há prestação do ano anterior** — o saldo bancário das Disponibilidades
   *   dela, conta a conta.
   * - **Não há** — zero. Se o ajuste começou neste exercício, zero é o certo e
   *   nada se diz; se começou antes, zero é um palpite, e a tela avisa.
   */
  private async saldoAnterior(
    ajusteId: string,
    ano: number,
    contas: { banco: number; agencia: number; conta: string; fonteRecursoTipo: number | null }[],
    esferasDoAjuste: Esfera[],
    inicioDoAjuste: string | null,
    informado: Partial<Record<Esfera, number>> | null,
  ): Promise<DadosDemonstrativo['saldoAnterior']> {
    if (informado) return { porEsfera: informado, semEsfera: 0, origem: null };

    const anterior = await prisma.prestacaoContas.findFirst({
      where: { ajusteId, ano: ano - 1, status: { notIn: ['EXCLUIDO', 'SUBSTITUIDO'] } },
      orderBy: { atualizadoEm: 'desc' },
      select: { disponibilidades: { select: { banco: true, agencia: true, conta: true, saldoBancario: true } } },
    });

    if (!anterior) {
      const comecouAntes = !!inicioDoAjuste && inicioDoAjuste < `${ano}-01-01`;
      return {
        porEsfera: {},
        semEsfera: 0,
        origem: comecouAntes
          ? `Não há prestação de ${ano - 1} no sistema: o saldo do exercício anterior (A) saiu como zero. Se havia saldo, informe-o no quadro acima do documento.`
          : null,
      };
    }

    const unica = esferasDoAjuste.length === 1 ? esferasDoAjuste[0] : null;
    const porEsfera: Partial<Record<Esfera, number>> = {};
    let semEsfera = 0;
    for (const d of anterior.disponibilidades) {
      const conta = contas.find((c) => c.banco === d.banco && c.agencia === d.agencia && c.conta === d.conta);
      const esfera = conta?.fonteRecursoTipo != null ? esferaDaFonte(conta.fonteRecursoTipo) : unica;
      const valor = num(d.saldoBancario);
      if (esfera) porEsfera[esfera] = Math.round(((porEsfera[esfera] ?? 0) + valor) * 100) / 100;
      else semEsfera += valor;
    }
    return { porEsfera, semEsfera: Math.round(semEsfera * 100) / 100, origem: null };
  }
}

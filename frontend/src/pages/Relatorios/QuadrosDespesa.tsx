import { CATEGORIA_DESPESA } from '@/lib/dominiosFaseV';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import { QuadroRelatorio, type ColunaRel } from './QuadroRelatorio';
import { TIPO_DOCUMENTO_FISCAL_LABEL } from '@/types/prestacaoBlocos';
import type { DespesaDoPeriodo, RelatorioDespesas } from './tipos';

/**
 * Os três quadros de despesa do período, no layout que a prestação de contas
 * usa — e que o anexo oficial do Tribunal repete somado por categoria.
 *
 * **Os três saem de um cálculo só** (`despesasDoPeriodo`, no core do
 * servidor). Montá-los por conta própria daria três respostas que se
 * contradizem num centavo, e a contradição iria para o documento assinado
 * pelo dirigente.
 */

const rotuloCategoria = (codigo: number) =>
  CATEGORIA_DESPESA.find((c) => c.value === String(codigo))?.label ?? String(codigo);

/** "NF 1234 — energia elétrica", como o quadro chama de especificação. */
const especificacao = (d: DespesaDoPeriodo) => {
  const tipo = d.tipoDocumento
    ? (TIPO_DOCUMENTO_FISCAL_LABEL[d.tipoDocumento as keyof typeof TIPO_DOCUMENTO_FISCAL_LABEL] ??
      d.tipoDocumento)
    : 'Documento';
  return `${tipo} nº ${d.numero}`;
};

const favorecido = (d: DespesaDoPeriodo) =>
  `${d.credorNome ?? '—'} (${mascaraCpfCnpj(d.credorNumeroDoc)})`;

const itemProposta = (d: DespesaDoPeriodo) =>
  [d.propostaCategoria, d.propostaSubcategoria].filter(Boolean).join(' / ');

/**
 * As colunas comuns aos três quadros.
 *
 * **"Número Página" fica em branco de propósito.** Ela é a página do
 * documento no dossiê encadernado, e o número só existe quando a prestação
 * inteira é gerada em arquivo — hoje é preenchida à mão na impressão. Omiti-la
 * mudaria um formulário que a equipe já conhece; preenchê-la com qualquer
 * coisa seria inventar a numeração do processo.
 */
function colunasBase(): ColunaRel<DespesaDoPeriodo>[] {
  return [
    {
      chave: 'data',
      rotulo: 'Data documento',
      celula: (d) => dataBr(d.dataEmissao),
      texto: (d) => dataBr(d.dataEmissao),
    },
    {
      chave: 'especificacao',
      rotulo: 'Especificação do documento',
      celula: (d) => (
        <span className="block truncate" title={d.descricao}>
          {especificacao(d)}
          <span className="block truncate text-xs text-ink-400">{d.descricao}</span>
        </span>
      ),
      texto: (d) => `${especificacao(d)} — ${d.descricao}`,
    },
    {
      chave: 'favorecido',
      rotulo: 'Favorecido',
      celula: (d) => (
        <span className="block truncate" title={favorecido(d)}>
          {favorecido(d)}
        </span>
      ),
      texto: favorecido,
    },
    {
      chave: 'categoria',
      rotulo: 'Categoria (Tribunal)',
      celula: (d) => (
        <span className="block truncate" title={rotuloCategoria(d.categoriaDespesaTipo)}>
          {rotuloCategoria(d.categoriaDespesaTipo)}
        </span>
      ),
      texto: (d) => rotuloCategoria(d.categoriaDespesaTipo),
    },
    {
      chave: 'pagina',
      rotulo: 'Número página',
      alinhar: 'center',
      celula: () => <span className="text-ink-300 dark:text-ink-600">—</span>,
      texto: () => '',
    },
    {
      chave: 'item',
      rotulo: 'Item da proposta',
      celula: (d) => (
        <span className="block truncate" title={itemProposta(d)}>
          {itemProposta(d) || <span className="text-ink-400">—</span>}
        </span>
      ),
      texto: itemProposta,
    },
  ];
}

const colunaValorContabil: ColunaRel<DespesaDoPeriodo> = {
  chave: 'contabil',
  rotulo: 'Valor contábil',
  alinhar: 'right',
  celula: (d) => formatarMoeda(d.valorContabil),
  texto: (d) => String(d.valorContabil),
  rodape: (ls) => formatarMoeda(ls.reduce((s, d) => s + d.valorContabil, 0)),
};

export function QuadrosDespesa({
  dados,
  erro,
  ajusteEscolhido,
}: {
  dados: RelatorioDespesas | null;
  erro: string | null;
  /** Só para o nome do arquivo exportado. */
  ajusteEscolhido: string;
}) {
  const sufixo = [ajusteEscolhido, dados?.periodo.de, dados?.periodo.ate]
    .filter(Boolean)
    .join('-');

  /* Pagas: a data e o valor do desembolso, mais o código do extrato — que só
     existe porque a conciliação foi feita, e é o que prova o pagamento. */
  const colunasPagas: ColunaRel<DespesaDoPeriodo>[] = [
    ...colunasBase(),
    colunaValorContabil,
    {
      chave: 'dataPgto',
      rotulo: 'Data pagamento',
      celula: (d) => (
        <span className="block">
          {d.pagamentos.map((p, i) => (
            <span key={i} className="block whitespace-nowrap">
              {dataBr(p.data)}
              {p.codigoExtrato && (
                <span className="block truncate text-xs text-ink-400" title={p.codigoExtrato}>
                  extrato {p.codigoExtrato}
                </span>
              )}
            </span>
          ))}
        </span>
      ),
      texto: (d) =>
        d.pagamentos.map((p) => `${dataBr(p.data)}${p.codigoExtrato ? ` (${p.codigoExtrato})` : ''}`).join(' · '),
    },
    {
      chave: 'valorPago',
      rotulo: 'Valor pago',
      alinhar: 'right',
      celula: (d) => formatarMoeda(d.pagoNoPeriodo),
      texto: (d) => String(d.pagoNoPeriodo),
      rodape: (ls) => formatarMoeda(ls.reduce((s, d) => s + d.pagoNoPeriodo, 0)),
    },
  ];

  const colunasNaoPagas: ColunaRel<DespesaDoPeriodo>[] = [
    ...colunasBase(),
    {
      ...colunaValorContabil,
      rotulo: 'Valor a pagar',
      celula: (d) => formatarMoeda(d.aPagar),
      texto: (d) => String(d.aPagar),
      rodape: (ls) => formatarMoeda(ls.reduce((s, d) => s + d.aPagar, 0)),
    },
  ];

  return (
    <div className="space-y-8">
      <QuadroRelatorio
        titulo="Despesas contabilizadas no período"
        colunas={colunasPagas}
        linhas={dados?.contabilizadas ?? null}
        erro={erro}
        arquivo={`despesas-contabilizadas-${sufixo}`}
        vazio="Nenhum documento fiscal com data neste período."
      />

      <QuadroRelatorio
        titulo="Despesas consideradas e não pagas"
        colunas={colunasNaoPagas}
        linhas={dados?.naoPagas ?? null}
        erro={erro}
        arquivo={`despesas-a-pagar-${sufixo}`}
        vazio="Tudo que foi contabilizado no período já foi pago."
      >
        {/* O saldo é o do fechamento, não o de hoje: relido meses depois, o
            quadro precisa dar o mesmo número que deu no fechamento. */}
        <p className="text-xs text-ink-400">
          O que faltava pagar <strong>no último dia do período</strong>. Pagamento feito depois não
          apaga a dívida que existia no fechamento.
        </p>
      </QuadroRelatorio>

      <QuadroRelatorio
        titulo="Despesas consideradas e pagas (documentos comprobatórios)"
        colunas={colunasPagas}
        linhas={dados?.pagas ?? null}
        erro={erro}
        arquivo={`despesas-pagas-${sufixo}`}
        vazio="Nenhum pagamento neste período."
      >
        <p className="text-xs text-ink-400">
          Inclui a despesa de períodos <strong>anteriores</strong> paga agora — é desembolso deste
          período, e é a coluna (H) do anexo do Tribunal.
        </p>
      </QuadroRelatorio>

      {dados && <Resumo dados={dados} />}
    </div>
  );
}

/** O RESUMO: o que entrou, o que foi contabilizado e o que saiu. */
function Resumo({ dados }: { dados: RelatorioDespesas }) {
  const { resumo, totais } = dados;

  const linha = (rotulo: string, valor: number, nota?: string, forte = false) => (
    <div
      key={rotulo}
      className={
        'flex items-baseline justify-between gap-4 border-b border-ink-100 py-1.5 last:border-0 dark:border-ink-800' +
        (forte ? ' font-semibold text-ink-800 dark:text-ink-100' : '')
      }
    >
      <span className="text-ink-600 dark:text-ink-300">
        {rotulo}
        {nota && <span className="block text-xs font-normal text-ink-400">{nota}</span>}
      </span>
      <span className="shrink-0 tabular-nums">{formatarMoeda(valor)}</span>
    </div>
  );

  return (
    <section className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
      <h3 className="mb-3 text-sm font-semibold text-ink-800 dark:text-ink-100">Resumo</h3>
      <div className="grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          {linha('Repasses recebidos', resumo.repasses)}
          {linha('Rendimentos de aplicação financeira', resumo.rendimentos)}
          {linha('Outras receitas', resumo.outrasReceitas, 'exceto repasses e rendimentos')}
          {linha('Total de recursos públicos', resumo.totalRecursosPublicos, undefined, true)}
          {linha('Recursos próprios da entidade', resumo.recursosProprios)}
          {linha('Total disponível no período', resumo.totalDisponivel, undefined, true)}
        </div>
        <div>
          {linha('Despesas contabilizadas', totais.contabilizado)}
          {linha('Despesas a pagar', totais.aPagar, 'contabilizadas e em aberto no fechamento')}
          {linha(
            'Pagas — de períodos anteriores (H)',
            totais.anterioresPagasNoPeriodo,
          )}
          {linha('Pagas — contabilizadas no período (I)', totais.contabilizadoEPagoNoPeriodo)}
          {linha('Total pago no período (J = H + I)', totais.pagoNoPeriodo, undefined, true)}
        </div>
      </div>
      {/*
        Provisões ficam de fora, e o documento que as pediu já dizia isso. Uma
        linha zerada com rótulo oficial faria o leitor supor que o sistema
        apurou e deu zero — que é pior que a ausência.
      */}
      <p className="mt-3 text-xs text-ink-400">
        Provisões reservadas e saldo de provisionamento ainda não são apurados pelo sistema, e por
        isso não aparecem aqui.
      </p>
    </section>
  );
}

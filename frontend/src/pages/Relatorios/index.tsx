import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, ClipboardList, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { QuadroRelatorio, type ColunaRel } from './QuadroRelatorio';
import { listarAjustes } from '@/services/ajustes.service';
import {
  relatorioExecucao,
  relatorioRepasses,
  relatorioSituacao,
  type FiltroRelatorio,
} from '@/services/relatorios.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { STATUS_PRESTACAO_LABEL, type StatusPrestacao } from '@/types/prestacao';
import { ATRASO_RELEVANTE_DIAS, type LinhaExecucao, type LinhaRepasse, type ResumoSituacao } from './tipos';

type Aba = 'execucao' | 'repasses' | 'situacao';

const ABAS: { id: Aba; rotulo: string; icone: typeof Wallet; descricao: string }[] = [
  {
    id: 'execucao',
    rotulo: 'Execução por ajuste',
    icone: Wallet,
    descricao: 'Do pactuado, quanto saiu do órgão e quanto a entidade já gastou.',
  },
  {
    id: 'repasses',
    rotulo: 'Repasses: previsto × realizado',
    icone: CalendarClock,
    descricao: 'Atraso e diferença de valor em cada parcela repassada.',
  },
  {
    id: 'situacao',
    rotulo: 'Prestações por situação',
    icone: ClipboardList,
    descricao: 'Panorama por exercício — e os ajustes que ainda não prestaram contas.',
  },
];

const soma = <T,>(linhas: T[], f: (l: T) => number) => linhas.reduce((s, l) => s + f(l), 0);
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

/**
 * Relatórios gerenciais.
 *
 * Não são documentos para o TCESP (isso é o Espelho) nem para o portal (isso é
 * a Transparência). São para dentro do órgão: onde está o dinheiro, o que
 * atrasou e o que falta prestar.
 */
export function Relatorios() {
  const [aba, setAba] = useState<Aba>('execucao');
  const [ajusteId, setAjusteId] = useState('');
  const [ano, setAno] = useState('');
  const [ajustes, setAjustes] = useState<{ value: string; label: string }[]>([]);

  const [execucao, setExecucao] = useState<LinhaExecucao[] | null>(null);
  const [repasses, setRepasses] = useState<LinhaRepasse[] | null>(null);
  const [situacao, setSituacao] = useState<ResumoSituacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const filtro = useMemo<FiltroRelatorio>(
    () => ({ ajusteId: ajusteId || undefined, ano: ano ? Number(ano) : undefined }),
    [ajusteId, ano],
  );

  useEffect(() => {
    listarAjustes({ page: 1, pageSize: 100, orderBy: 'dataAssinatura', orderDir: 'desc' })
      .then((r) =>
        setAjustes(
          r.data.map((a) => ({ value: a.id, label: `${a.codigoAjuste} — ${a.entidadeNome}` })),
        ),
      )
      .catch(() => setAjustes([]));
  }, []);

  useEffect(() => {
    let vivo = true;
    setErro(null);
    setExecucao(null);
    setRepasses(null);
    setSituacao(null);

    const carregar =
      aba === 'execucao'
        ? relatorioExecucao(filtro).then((d) => vivo && setExecucao(d))
        : aba === 'repasses'
          ? relatorioRepasses(filtro).then((d) => vivo && setRepasses(d))
          : relatorioSituacao(filtro).then((d) => vivo && setSituacao(d));

    carregar.catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível montar o relatório.')));
    return () => {
      vivo = false;
    };
  }, [aba, filtro]);

  const filtros = (
    <>
      <div className="w-full sm:w-80">
        <Select
          label="Ajuste"
          name="ajusteId"
          value={ajusteId}
          onChange={(e) => setAjusteId(e.target.value)}
          options={ajustes}
          placeholder="Todos os ajustes"
        />
      </div>
      <div className="w-full sm:w-32">
        <Input
          label="Exercício"
          name="ano"
          value={ano}
          onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="Todos"
          inputMode="numeric"
        />
      </div>
    </>
  );

  const colunasExecucao: ColunaRel<LinhaExecucao>[] = [
    {
      chave: 'ajuste',
      rotulo: 'Ajuste',
      celula: (l) => (
        <Link to={`/cadastro/ajustes/${l.ajusteId}`} className="text-brand-600 hover:underline dark:text-brand-300">
          <span className="block font-mono text-xs font-medium">{l.codigoAjuste}</span>
          <span className="block text-[11px] text-ink-400">{l.entidadeNome}</span>
        </Link>
      ),
      texto: (l) => `${l.codigoAjuste} — ${l.entidadeNome}`,
      rodape: (ls) => `${ls.length} ajuste(s)`,
    },
    {
      chave: 'valorGlobal',
      rotulo: 'Valor global',
      alinhar: 'right',
      celula: (l) => formatarMoeda(l.valorGlobal),
      texto: (l) => String(l.valorGlobal),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.valorGlobal)),
    },
    {
      chave: 'repassado',
      rotulo: 'Repassado',
      alinhar: 'right',
      celula: (l) => formatarMoeda(l.repassado),
      texto: (l) => String(l.repassado),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.repassado)),
    },
    {
      chave: 'pago',
      rotulo: 'Pago pela OSC',
      alinhar: 'right',
      celula: (l) => formatarMoeda(l.pago),
      texto: (l) => String(l.pago),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.pago)),
    },
    {
      chave: 'emPoder',
      rotulo: 'Em poder da OSC',
      alinhar: 'right',
      celula: (l) => (
        <span className={l.emPoderDaEntidade < 0 ? 'font-semibold text-red-600 dark:text-red-400' : undefined}>
          {formatarMoeda(l.emPoderDaEntidade)}
        </span>
      ),
      texto: (l) => String(l.emPoderDaEntidade),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.emPoderDaEntidade)),
    },
    {
      chave: 'aRepassar',
      rotulo: 'A repassar',
      alinhar: 'right',
      celula: (l) => formatarMoeda(l.aRepassar),
      texto: (l) => String(l.aRepassar),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.aRepassar)),
    },
    {
      chave: 'execucao',
      rotulo: 'Execução',
      alinhar: 'right',
      celula: (l) => pct(l.execucao),
      texto: (l) => pct(l.execucao),
    },
  ];

  const colunasRepasses: ColunaRel<LinhaRepasse>[] = [
    {
      chave: 'ajuste',
      rotulo: 'Ajuste',
      celula: (l) => (
        <Link to={`/cadastro/ajustes/${l.ajusteId}`} className="text-brand-600 hover:underline dark:text-brand-300">
          <span className="block font-mono text-xs font-medium">{l.codigoAjuste}</span>
          <span className="block text-[11px] text-ink-400">{l.entidadeNome}</span>
        </Link>
      ),
      texto: (l) => `${l.codigoAjuste} — ${l.entidadeNome}`,
      rodape: (ls) => `${ls.length} parcela(s)`,
    },
    { chave: 'ano', rotulo: 'Exercício', alinhar: 'center', celula: (l) => l.ano, texto: (l) => String(l.ano) },
    {
      chave: 'previsto',
      rotulo: 'Previsto',
      celula: (l) => (
        <span className="whitespace-nowrap">
          {dataBr(l.dataPrevista)} · {formatarMoeda(l.valorPrevisto)}
        </span>
      ),
      texto: (l) => `${dataBr(l.dataPrevista)} / ${l.valorPrevisto}`,
    },
    {
      chave: 'realizado',
      rotulo: 'Realizado',
      celula: (l) => (
        <span className="whitespace-nowrap">
          {dataBr(l.dataRepasse)} · {formatarMoeda(l.valorRepasse)}
        </span>
      ),
      texto: (l) => `${dataBr(l.dataRepasse)} / ${l.valorRepasse}`,
    },
    {
      chave: 'atraso',
      rotulo: 'Atraso',
      alinhar: 'right',
      celula: (l) =>
        l.atrasoDias > 0 ? (
          <span className={l.atrasoDias >= ATRASO_RELEVANTE_DIAS ? 'font-semibold text-red-600 dark:text-red-400' : undefined}>
            {l.atrasoDias}d
          </span>
        ) : (
          <span className="text-ink-400">{l.atrasoDias === 0 ? 'no prazo' : `${-l.atrasoDias}d antes`}</span>
        ),
      texto: (l) => String(l.atrasoDias),
    },
    {
      chave: 'diferenca',
      rotulo: 'Diferença',
      alinhar: 'right',
      celula: (l) =>
        l.diferencaValor === 0 ? (
          <span className="text-ink-400">—</span>
        ) : (
          <span className={l.diferencaValor < 0 ? 'text-red-600 dark:text-red-400' : undefined}>
            {formatarMoeda(l.diferencaValor)}
          </span>
        ),
      texto: (l) => String(l.diferencaValor),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.diferencaValor)),
    },
    {
      chave: 'justificativa',
      rotulo: 'Justificativa',
      celula: (l) => <span className="text-ink-500 dark:text-ink-400">{l.justificativa ?? '—'}</span>,
      texto: (l) => l.justificativa ?? '',
    },
  ];

  const rotulo = ABAS.find((a) => a.id === aba)!;

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Acompanhamento gerencial das parcerias — para dentro do órgão, não para o Tribunal."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        {ABAS.map((a) => {
          const Icone = a.icone;
          const ativa = a.id === aba;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`focus-ring rounded-2xl border p-4 text-left transition-all ${
                ativa
                  ? 'border-brand-500 bg-brand-50 shadow-card dark:bg-brand-500/10'
                  : 'border-ink-200/70 bg-white hover:-translate-y-0.5 hover:shadow-card dark:border-ink-800/70 dark:bg-ink-900'
              }`}
            >
              <Icone className={`h-5 w-5 ${ativa ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400'}`} />
              <p className="mt-2 text-sm font-semibold text-ink-800 dark:text-ink-100">{a.rotulo}</p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{a.descricao}</p>
            </button>
          );
        })}
      </div>

      {aba === 'execucao' && (
        <QuadroRelatorio
          titulo={rotulo.rotulo}
          arquivo="execucao-por-ajuste"
          colunas={colunasExecucao}
          linhas={execucao}
          erro={erro}
          vazio="Nenhum ajuste cadastrado."
        >
          {filtros}
        </QuadroRelatorio>
      )}

      {aba === 'repasses' && (
        <QuadroRelatorio
          titulo={rotulo.rotulo}
          arquivo="repasses-previsto-realizado"
          colunas={colunasRepasses}
          linhas={repasses}
          erro={erro}
          vazio="Nenhum repasse informado nas prestações deste recorte."
          classeLinha={(l) => (l.atrasoDias >= ATRASO_RELEVANTE_DIAS ? 'bg-red-50/60 dark:bg-red-500/5' : undefined)}
        >
          {filtros}
        </QuadroRelatorio>
      )}

      {aba === 'situacao' && (
        <SituacaoView resumo={situacao} erro={erro} filtros={filtros} titulo={rotulo.rotulo} />
      )}

      <p className="mt-4 text-xs text-ink-400 print:hidden">
        Os valores vêm dos blocos das prestações de contas cadastradas. Ajuste sem prestação aparece
        com execução zerada — que é o que se quer enxergar.
      </p>
    </>
  );
}

/** A situação tem duas tabelas, então não cabe no molde de uma só. */
function SituacaoView({
  resumo,
  erro,
  filtros,
  titulo,
}: {
  resumo: ResumoSituacao | null;
  erro: string | null;
  filtros: React.ReactNode;
  titulo: string;
}) {
  const colunas: ColunaRel<ResumoSituacao['linhas'][number]>[] = [
    { chave: 'ano', rotulo: 'Exercício', celula: (l) => l.ano, texto: (l) => String(l.ano) },
    {
      chave: 'status',
      rotulo: 'Situação',
      celula: (l) => STATUS_PRESTACAO_LABEL[l.status as StatusPrestacao] ?? l.status,
      texto: (l) => STATUS_PRESTACAO_LABEL[l.status as StatusPrestacao] ?? l.status,
    },
    {
      chave: 'quantidade',
      rotulo: 'Prestações',
      alinhar: 'right',
      celula: (l) => l.quantidade,
      texto: (l) => String(l.quantidade),
      rodape: (ls) => soma(ls, (l) => l.quantidade),
    },
    {
      chave: 'valorGlobal',
      rotulo: 'Valor global dos ajustes',
      alinhar: 'right',
      celula: (l) => formatarMoeda(l.valorGlobal),
      texto: (l) => String(l.valorGlobal),
      rodape: (ls) => formatarMoeda(soma(ls, (l) => l.valorGlobal)),
    },
  ];

  return (
    <div className="space-y-5">
      <QuadroRelatorio
        titulo={titulo}
        arquivo="prestacoes-por-situacao"
        colunas={colunas}
        linhas={resumo?.linhas ?? null}
        erro={erro}
        vazio="Nenhuma prestação cadastrada."
      >
        {filtros}
      </QuadroRelatorio>

      {!!resumo?.ajustesSemPrestacao.length && (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-card dark:border-amber-500/30 dark:bg-ink-900">
          <div className="flex items-center gap-2 border-b border-amber-100 px-4 py-3 dark:border-amber-500/20">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
              {resumo.ajustesSemPrestacao.length} ajuste(s) sem nenhuma prestação
            </p>
          </div>
          {/* É a informação que o quadro de cima não consegue dar: quem não
              aparece em nenhuma linha porque nunca começou. */}
          <ul className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
            {resumo.ajustesSemPrestacao.map((a) => (
              <li key={a.ajusteId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <Link
                  to={`/cadastro/ajustes/${a.ajusteId}`}
                  className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-300"
                >
                  {a.codigoAjuste}
                </Link>
                <span className="min-w-0 flex-1 truncate text-ink-600 dark:text-ink-300">{a.entidadeNome}</span>
                <span className="text-xs text-ink-400">assinado em {dataBr(a.dataAssinatura)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Minus, Save, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { extrairMensagemErro } from '@/services/http';
import { execucaoTecnicaApi, type PainelTecnico } from '@/services/execucaoTecnica.service';
import { useAjusteExecucao } from '@/contexts/AjusteExecucaoContext';
import {
  avaliarMeta,
  ehQuantificavel,
  ehRelativo,
  gerarPeriodos,
  intervaloPeriodo,
  rotuloPeriodo,
  rotuloQualificador,
  simboloQualificador,
  type PeriodoMeta,
} from '@/types/meta';
import { diasAbsorvidos } from '@/types/vigencia';
import { RESULTADO_META_LABEL, type ResultadoMeta } from '@/types/prestacaoBlocos6';
import type { Meta, Programa } from '@/types/programa';

/**
 * Execução Técnica — o **realizado** das metas, lançado ao longo do ano.
 *
 * O previsto já foi digitado na celebração (Ajuste → Programas e Metas); aqui
 * só se acrescenta o que aconteceu em cada período, que é o que a entidade
 * apura mês a mês e hoje guarda em planilha até a prestação.
 *
 * **Não há tabela própria.** Grava nas mesmas linhas do Relatório de
 * Atividades da prestação — o bloco §19, que é o que se transmite. Um registro
 * paralelo daria dois números para o mesmo fato, e a divergência só apareceria
 * no Espelho, na véspera de transmitir.
 */
export function ExecucaoTecnica() {
  const { ajusteId } = useAjusteExecucao();
  const [exercicio, setExercicio] = useState(() => new Date().getFullYear());
  const [painel, setPainel] = useState<PainelTecnico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!ajusteId) return;
    let vivo = true;
    setCarregando(true);
    setErro(null);
    execucaoTecnicaApi
      .painel(ajusteId, exercicio)
      .then((p) => vivo && setPainel(p))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as metas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ajusteId, exercicio, refreshKey]);

  /*
   * Os exercícios ofertados saem da vigência das metas, não de um intervalo
   * fixo. Oferecer 2020–2030 convidaria a lançar num ano em que a parceria
   * não existe — e o quadro apareceria vazio, sem dizer por quê.
   */
  const anos = useMemo(() => {
    const set = new Set<number>([exercicio]);
    for (const p of painel?.programas ?? [])
      for (const m of p.metas)
        for (const x of gerarPeriodos(m.periodicidade, m.vigenciaInicio, m.vigenciaFim)) set.add(x.ano);
    return [...set].sort((a, b) => a - b);
  }, [painel, exercicio]);

  const metas = useMemo(
    () =>
      (painel?.programas ?? []).flatMap((p) =>
        p.metas.map((m) => ({ programa: p, meta: m })),
      ),
    [painel],
  );

  if (!ajusteId) return null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900 dark:text-ink-50">Execução Técnica</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            O realizado de cada meta, período a período. O previsto vem do Plano de Metas do
            Ajuste; aqui se acrescenta o que foi executado.
          </p>
        </div>
        <label className="text-xs text-ink-500 dark:text-ink-400">
          Exercício
          <Select
            name="exercicio"
            value={String(exercicio)}
            onChange={(e) => setExercicio(Number(e.target.value))}
            options={anos.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </label>
      </header>

      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      {/*
        Sem prestação do exercício não há onde gravar — e dizer isso é melhor
        que desabilitar os campos em silêncio. O previsto continua à vista:
        ver o que foi pactuado não depende de haver onde lançar.
      */}
      {painel && !painel.prestacaoId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Não há prestação de contas de <strong>{painel.exercicio}</strong> para esta parceria. O
          realizado é guardado nela — é o mesmo dado que vai ao Tribunal no Relatório de
          Atividades —, então abra-a primeiro em{' '}
          <Link to="/prestacao-contas" className="font-semibold underline">
            Prestação de Contas
          </Link>
          . Abaixo fica o previsto, só para conferência.
        </div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 px-1 py-10 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando as metas...
        </div>
      ) : metas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-400 dark:border-ink-700">
          Esta parceria não tem metas cadastradas. Cadastre em{' '}
          <strong>Ajuste → Programas e Metas</strong> — é o previsto contra o qual a execução é
          comparada.
        </div>
      ) : (
        metas.map(({ programa, meta }) => (
          <CartaoMeta
            key={meta.id}
            programa={programa}
            meta={meta}
            exercicio={exercicio}
            painel={painel!}
            ajusteId={ajusteId}
            aoSalvar={() => setRefreshKey((k) => k + 1)}
          />
        ))
      )}
    </div>
  );
}

/** O que a tela guarda por período, antes de ir ao servidor. */
interface Rascunho {
  realizado: string;
  resultado: ResultadoMeta | '';
  observacao: string;
  sujo: boolean;
}

function CartaoMeta({
  programa,
  meta,
  exercicio,
  painel,
  ajusteId,
  aoSalvar,
}: {
  programa: Programa;
  meta: Meta;
  exercicio: number;
  painel: PainelTecnico;
  ajusteId: string;
  aoSalvar: () => void;
}) {
  const quantificavel = ehQuantificavel(meta.tipo);

  /** Só os períodos **deste exercício**: a aferição guarda o número, não o ano. */
  const periodos = useMemo(
    () =>
      gerarPeriodos(meta.periodicidade, meta.vigenciaInicio, meta.vigenciaFim).filter(
        (p) => p.ano === exercicio,
      ),
    [meta, exercicio],
  );

  const absorvidos = useMemo(
    () => diasAbsorvidos(meta.vigenciaInicio, meta.vigenciaFim),
    [meta.vigenciaInicio, meta.vigenciaFim],
  );

  const previstoDe = (p: PeriodoMeta) =>
    meta.periodicidades.find((x) => x.ano === p.ano && x.periodo === p.periodo) ?? null;

  const afericaoDe = (p: PeriodoMeta) =>
    painel.afericoes.find(
      (a) => a.nomePrograma === programa.nome && a.codigoMeta === meta.codigoMeta && a.periodo === p.periodo,
    ) ?? null;

  const inicial = (): Record<number, Rascunho> => {
    const out: Record<number, Rascunho> = {};
    for (const p of periodos) {
      const a = afericaoDe(p);
      out[p.periodo] = {
        realizado: a?.quantidadeRealizada != null ? String(a.quantidadeRealizada).replace('.', ',') : '',
        resultado: a?.resultadoMeta ?? '',
        observacao: a?.justificativaPeriodo ?? '',
        sujo: false,
      };
    }
    return out;
  };

  const [rascunho, setRascunho] = useState<Record<number, Rascunho>>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // O quadro se refaz quando os dados do servidor mudam — depois de salvar, o
  // que a tela mostra passa a ser o que **ficou** gravado, não o que foi
  // digitado. Mesmo cuidado do `key` no Plano de Aplicação.
  useEffect(() => {
    setRascunho(inicial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel.afericoes, periodos]);

  const alterar = (periodo: number, campo: keyof Rascunho, valor: string) =>
    setRascunho((r) => ({ ...r, [periodo]: { ...r[periodo], [campo]: valor, sujo: true } }));

  const numero = (texto: string): number | null => {
    const t = texto.trim();
    if (!t) return null;
    const n = Number(t.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const sujos = periodos.filter((p) => rascunho[p.periodo]?.sujo);

  async function salvar() {
    setErro(null);
    setOk(false);

    // Conferência antes de enviar: o servidor recusa "quantidade OU
    // resultado", e descobrir isso no quinto período faria perder os quatro
    // anteriores da mesma gravação.
    for (const p of sujos) {
      const r = rascunho[p.periodo];
      if (quantificavel) {
        if (!r.realizado.trim()) continue;
        const n = numero(r.realizado);
        if (n === null || n < 0)
          return setErro(`Quantidade realizada inválida em ${rotuloPeriodo(meta.periodicidade, p)}.`);
      }
    }

    setSalvando(true);
    try {
      // Em série, não em paralelo: doze períodos de uma vez são exatamente a
      // rajada que o teto de 300 req/min existe para conter.
      for (const p of sujos) {
        const r = rascunho[p.periodo];
        const n = quantificavel ? numero(r.realizado) : null;
        const res = quantificavel ? null : r.resultado || null;

        // Linha esvaziada: apaga a aferição em vez de gravar nada. Sem isso,
        // corrigir um lançamento errado exigiria ir à tela da prestação.
        if (n === null && !res) {
          const a = afericaoDe(p);
          if (a) await execucaoTecnicaApi.remover(ajusteId, exercicio, a.id);
          continue;
        }

        await execucaoTecnicaApi.registrar(ajusteId, exercicio, {
          nomePrograma: programa.nome,
          codigoMeta: meta.codigoMeta,
          periodo: p.periodo,
          quantidadeRealizada: n,
          resultadoMeta: res as ResultadoMeta | null,
          justificativaPeriodo: r.observacao.trim() || null,
        });
      }
      setOk(true);
      aoSalvar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Falha ao gravar o realizado.'));
    } finally {
      setSalvando(false);
    }
  }

  const podeGravar = !!painel.prestacaoId;

  return (
    <section className="rounded-xl border border-ink-200 dark:border-ink-700">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-400">
            <Target className="mr-1 inline h-3 w-3" />
            {programa.nome}
          </p>
          <h2 className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
            {meta.codigoMeta} — {meta.nome}
          </h2>
          <p className="text-xs text-ink-400">
            {meta.unidadeMedida || 'Sem unidade'} · {periodos.length}{' '}
            {periodos.length === 1 ? 'período' : 'períodos'} em {exercicio}
            {(absorvidos.noInicio > 0 || absorvidos.noFim > 0) && (
              <>
                {' '}
                · dias de vigência fora do quadro são apurados no período vizinho
              </>
            )}
          </p>
        </div>
        {podeGravar && (
          <Button type="button" size="sm" onClick={salvar} disabled={salvando || !sujos.length}>
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {sujos.length ? `Salvar ${sujos.length}` : 'Salvar'}
          </Button>
        )}
      </header>

      {erro && (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {erro}
        </p>
      )}
      {ok && !sujos.length && (
        <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Realizado gravado.
        </p>
      )}

      {periodos.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-400">
          A vigência desta meta não alcança {exercicio}.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {periodos.map((p) => {
            const prev = previstoDe(p);
            const r = rascunho[p.periodo] ?? { realizado: '', resultado: '', observacao: '', sujo: false };
            const realizado = quantificavel ? numero(r.realizado) : null;
            const aval =
              prev && quantificavel ? avaliarMeta(prev.qualificador, prev.quantidade, realizado) : null;

            return (
              <li key={p.periodo} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-12 sm:items-start">
                <div className="sm:col-span-3">
                  <p className="text-sm text-ink-700 dark:text-ink-200">
                    {rotuloPeriodo(meta.periodicidade, p)} de {p.ano}
                  </p>
                  <p className="text-xs text-ink-400">{intervaloPeriodo(p)}</p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-ink-400">Previsto</p>
                  <p className="text-sm tabular-nums text-ink-700 dark:text-ink-200">
                    {prev ? (
                      <>
                        {simboloQualificador(prev.qualificador)} {prev.quantidade.toLocaleString('pt-BR')}
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </p>
                  {prev && (
                    <p className="text-[11px] text-ink-400" title={rotuloQualificador(prev.qualificador)}>
                      {rotuloQualificador(prev.qualificador)}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  {quantificavel ? (
                    <Input
                      label="Realizado"
                      name={`realizado-${meta.id}-${p.periodo}`}
                      value={r.realizado}
                      onChange={(e) => alterar(p.periodo, 'realizado', e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={!podeGravar}
                    />
                  ) : (
                    <Select
                      label="Resultado"
                      name={`resultado-${meta.id}-${p.periodo}`}
                      value={r.resultado}
                      onChange={(e) => alterar(p.periodo, 'resultado', e.target.value)}
                      options={(Object.keys(RESULTADO_META_LABEL) as ResultadoMeta[]).map((x) => ({
                        value: x,
                        label: RESULTADO_META_LABEL[x],
                      }))}
                      placeholder="Selecione..."
                      disabled={!podeGravar}
                    />
                  )}
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Observação do período"
                    name={`obs-${meta.id}-${p.periodo}`}
                    value={r.observacao}
                    onChange={(e) => alterar(p.periodo, 'observacao', e.target.value)}
                    placeholder="Opcional"
                    disabled={!podeGravar}
                  />
                </div>

                <div className="sm:col-span-1 sm:pt-6">
                  <Situacao aval={aval} relativo={!!prev && ehRelativo(prev.qualificador)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        O juízo "meta atendida" não é feito aqui, e dizer isso evita que alguém
        procure o campo. Ele vence a aritmética na apuração que pode virar
        desconto no repasse, e quem o assina é a Comissão de Fiscalização —
        não quem digita o atendimento do mês.
      */}
      <p className="border-t border-ink-100 px-4 py-2 text-[11px] text-ink-400 dark:border-ink-800">
        Esta tela registra <strong>o que aconteceu</strong>. O juízo de meta atendida e a
        justificativa que vão ao Tribunal ficam no Relatório de Atividades da prestação.
      </p>
    </section>
  );
}

/** Verde, âmbar ou traço — e nunca só a cor: estado anda com ícone e rótulo. */
function Situacao({
  aval,
  relativo,
}: {
  aval: { atingiu: boolean | null; diferenca: number } | null;
  relativo: boolean;
}) {
  if (relativo)
    return (
      <Badge tone="neutral" title="Meta de variação: depende de um ponto de partida que o sistema não guarda.">
        conferir
      </Badge>
    );
  if (!aval || aval.atingiu === null)
    return (
      <span className="text-ink-300 dark:text-ink-600">
        <Minus className="h-4 w-4" />
      </span>
    );
  return aval.atingiu ? (
    <Badge tone="success">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      atingida
    </Badge>
  ) : (
    <Badge tone="warning" title={`Faltam ${aval.diferenca.toLocaleString('pt-BR')}`}>
      <AlertTriangle className="mr-1 h-3 w-3" />
      faltam {aval.diferenca.toLocaleString('pt-BR')}
    </Badge>
  );
}

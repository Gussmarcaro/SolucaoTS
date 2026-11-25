import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { extrairMensagemErro } from '@/services/http';
import { execucaoTecnicaApi, type PainelTecnico } from '@/services/execucaoTecnica.service';
import {
  avaliarMeta,
  ehQuantificavel,
  ehRelativo,
  gerarPeriodos,
  intervaloPeriodo,
  rotuloPeriodo,
  rotuloPeriodicidadeMeta,
  rotuloQualificador,
  simboloQualificador,
  situacaoMeta,
  type PeriodicidadeMeta,
  type PeriodoMeta,
} from '@/types/meta';
import type { Meta, Programa } from '@/types/programa';

/**
 * O realizado em **quadro**: metas nas linhas, períodos nas colunas.
 *
 * ## Por que esta forma
 *
 * É como o dado chega a quem lança: no fim do mês, a planilha da entidade traz
 * os números de **todas** as metas daquele mês. Na visão por meta, lançar
 * fevereiro obrigava a rolar por todos os cartões procurando a linha de
 * fevereiro em cada um. Aqui se desce uma coluna só: **Enter leva à meta de
 * baixo, no mesmo mês**, e o mês inteiro sai sem tirar a mão do teclado.
 *
 * ## O que fica de fora, de propósito
 *
 * - **Metas qualitativas**: a resposta delas é uma escolha entre três, não um
 *   número, e não cabe numa célula de digitação rápida.
 * - **A observação do período**: um campo de texto por célula transformaria o
 *   quadro numa parede de caixas. Ela continua na visão por meta, e o que se
 *   grava aqui **preserva** a observação que já estiver lá.
 *
 * As metas são agrupadas por periodicidade: um quadro mensal e um trimestral
 * não compartilham colunas, e misturá-los poria o 1º trimestre embaixo de
 * janeiro.
 */

interface Linha {
  programa: Programa;
  meta: Meta;
  periodos: PeriodoMeta[];
}

/** Chave de uma célula do quadro. */
const chave = (metaId: string, periodo: number) => `${metaId}|${periodo}`;

const numero = (texto: string): number | null => {
  const t = texto.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function QuadroMetas({
  painel,
  exercicio,
  ajusteId,
  aoSalvar,
}: {
  painel: PainelTecnico;
  exercicio: number;
  ajusteId: string;
  aoSalvar: () => void;
}) {
  const podeGravar = !!painel.prestacaoId;

  /** As linhas, já agrupadas por periodicidade, na ordem natural do código. */
  const grupos = useMemo(() => {
    const porPeriodicidade = new Map<PeriodicidadeMeta, Linha[]>();
    for (const programa of painel.programas)
      for (const meta of programa.metas) {
        if (!ehQuantificavel(meta.tipo)) continue;
        const periodos = gerarPeriodos(meta.periodicidade, meta.vigenciaInicio, meta.vigenciaFim).filter(
          (p) => p.ano === exercicio,
        );
        if (!periodos.length) continue;
        const lista = porPeriodicidade.get(meta.periodicidade) ?? [];
        lista.push({ programa, meta, periodos });
        porPeriodicidade.set(meta.periodicidade, lista);
      }
    return [...porPeriodicidade.entries()].map(([periodicidade, linhas]) => {
      // As colunas são a união dos períodos das metas do grupo: uma meta que
      // começa em março não tira janeiro do quadro das outras.
      const colunas = new Map<number, PeriodoMeta>();
      for (const l of linhas) for (const p of l.periodos) if (!colunas.has(p.periodo)) colunas.set(p.periodo, p);
      return {
        periodicidade,
        linhas,
        colunas: [...colunas.values()].sort((a, b) => a.periodo - b.periodo),
      };
    });
  }, [painel, exercicio]);

  const afericaoDe = (programa: Programa, meta: Meta, periodo: number) =>
    painel.afericoes.find(
      (a) => a.nomePrograma === programa.nome && a.codigoMeta === meta.codigoMeta && a.periodo === periodo,
    ) ?? null;

  /** O que está gravado, como texto de célula. */
  const gravado = useMemo(() => {
    const out: Record<string, string> = {};
    for (const g of grupos)
      for (const l of g.linhas)
        for (const p of l.periodos) {
          const a = afericaoDe(l.programa, l.meta, p.periodo);
          out[chave(l.meta.id, p.periodo)] =
            a?.quantidadeRealizada != null ? String(a.quantidadeRealizada).replace('.', ',') : '';
        }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, painel.afericoes]);

  const [rascunho, setRascunho] = useState<Record<string, string>>(gravado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Depois de salvar, o quadro passa a mostrar o que **ficou** gravado.
  useEffect(() => setRascunho(gravado), [gravado]);

  const sujas = Object.keys(rascunho).filter((k) => (rascunho[k] ?? '') !== (gravado[k] ?? ''));

  async function salvar() {
    setErro(null);
    setOk(false);
    // Confere tudo antes de enviar a primeira: descobrir o erro na décima
    // célula deixaria nove gravadas e uma não, sem a tela dizer quais.
    for (const k of sujas) {
      const t = rascunho[k];
      if (t.trim() && (numero(t) === null || numero(t)! < 0))
        return setErro(`Valor inválido: "${t}". Use só números, com vírgula para decimais.`);
    }
    setSalvando(true);
    try {
      // Em série: dezenas de células de uma vez são a rajada que o teto de
      // requisições por minuto existe para conter.
      for (const g of grupos)
        for (const l of g.linhas)
          for (const p of l.periodos) {
            const k = chave(l.meta.id, p.periodo);
            if (!sujas.includes(k)) continue;
            const n = numero(rascunho[k]);
            const existente = afericaoDe(l.programa, l.meta, p.periodo);
            if (n === null) {
              if (existente) await execucaoTecnicaApi.remover(ajusteId, exercicio, existente.id);
              continue;
            }
            await execucaoTecnicaApi.registrar(ajusteId, exercicio, {
              nomePrograma: l.programa.nome,
              codigoMeta: l.meta.codigoMeta,
              periodo: p.periodo,
              quantidadeRealizada: n,
              resultadoMeta: null,
              // A observação é da visão por meta; gravar daqui não pode apagá-la.
              justificativaPeriodo: existente?.justificativaPeriodo ?? null,
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

  /**
   * Enter desce para a meta de baixo **no mesmo período**; Shift+Enter sobe.
   * As setas fazem o mesmo. É o que permite lançar um mês inteiro de uma vez.
   */
  function navegar(e: KeyboardEvent<HTMLInputElement>, grupo: number, linha: number, coluna: number) {
    const passo =
      e.key === 'Enter' ? (e.shiftKey ? -1 : 1) : e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const alvo = document.querySelector<HTMLInputElement>(
      `[data-quadro="${grupo}"][data-linha="${linha + passo}"][data-coluna="${coluna}"]`,
    );
    alvo?.focus();
    alvo?.select();
  }

  if (grupos.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-400 dark:border-ink-700">
        Nenhuma meta quantitativa com períodos em {exercicio}. As qualitativas ficam na visão{' '}
        <strong>Por meta</strong>.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          <kbd className="rounded border border-ink-200 px-1 dark:border-ink-700">Enter</kbd> desce para a
          próxima meta no mesmo período. A observação de cada período fica na visão{' '}
          <strong>Por meta</strong>.
        </p>
        {podeGravar && (
          <Button type="button" size="sm" onClick={salvar} disabled={salvando || !sujas.length}>
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {sujas.length ? `Salvar ${sujas.length}` : 'Salvar'}
          </Button>
        )}
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {erro}
        </p>
      )}
      {ok && !sujas.length && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Realizado gravado.
        </p>
      )}

      {grupos.map((g, gi) => (
        <section key={g.periodicidade} className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
          {grupos.length > 1 && (
            <p className="border-b border-ink-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-400 dark:border-ink-800">
              Metas {rotuloPeriodicidadeMeta(g.periodicidade).toLowerCase()}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ink-50/70 dark:bg-ink-800/40">
                  <th className="sticky left-0 z-10 min-w-[16rem] bg-ink-50 px-3 py-2 text-left text-xs font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                    Meta
                  </th>
                  {g.colunas.map((c) => (
                    <th key={c.periodo} className="min-w-[6.5rem] px-2 py-2 text-center text-xs font-medium text-ink-500 dark:text-ink-400">
                      {rotuloPeriodo(g.periodicidade, c)}
                      <span className="block text-[10px] font-normal text-ink-400">{intervaloPeriodo(c)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {g.linhas.map((l, li) => (
                  <tr key={l.meta.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-normal dark:bg-ink-900"
                    >
                      <span className="block text-sm text-ink-800 dark:text-ink-100">
                        <span className="font-semibold tabular-nums">{l.meta.codigoMeta}</span> — {l.meta.nome}
                      </span>
                      <span className="block truncate text-[11px] text-ink-400">
                        {l.programa.nome}
                        {l.meta.unidadeMedida ? ` · ${l.meta.unidadeMedida}` : ''}
                      </span>
                    </th>
                    {g.colunas.map((c, ci) => {
                      const temPeriodo = l.periodos.some((p) => p.periodo === c.periodo);
                      if (!temPeriodo)
                        return (
                          <td key={c.periodo} className="px-2 py-2 text-center text-xs text-ink-300 dark:text-ink-600" title="Fora da vigência desta meta">
                            —
                          </td>
                        );
                      const k = chave(l.meta.id, c.periodo);
                      const prev =
                        l.meta.periodicidades.find((x) => x.ano === c.ano && x.periodo === c.periodo) ?? null;
                      const aval =
                        prev && !ehRelativo(prev.qualificador)
                          ? avaliarMeta(prev.qualificador, prev.quantidade, numero(rascunho[k] ?? ''))
                          : null;
                      const s = aval && prev ? situacaoMeta(prev.qualificador, aval) : null;
                      const suja = (rascunho[k] ?? '') !== (gravado[k] ?? '');
                      return (
                        <td key={c.periodo} className="px-1.5 py-1.5 align-top">
                          {prev && (
                            <span
                              className="block text-center text-[10px] tabular-nums text-ink-400"
                              title={`Previsto: ${rotuloQualificador(prev.qualificador)} ${prev.quantidade.toLocaleString('pt-BR')}`}
                            >
                              {simboloQualificador(prev.qualificador)} {prev.quantidade.toLocaleString('pt-BR')}
                            </span>
                          )}
                          <input
                            value={rascunho[k] ?? ''}
                            onChange={(e) =>
                              setRascunho((r) => ({ ...r, [k]: e.target.value.replace(/[^\d,.]/g, '') }))
                            }
                            onKeyDown={(e) => navegar(e, gi, li, ci)}
                            onFocus={(e) => e.target.select()}
                            data-quadro={gi}
                            data-linha={li}
                            data-coluna={ci}
                            inputMode="decimal"
                            disabled={!podeGravar}
                            aria-label={`${l.meta.codigoMeta} — ${rotuloPeriodo(g.periodicidade, c)} de ${c.ano}`}
                            title={s?.texto}
                            className={cn(
                              'focus-ring h-8 w-full rounded-md border bg-white px-2 text-right text-sm tabular-nums text-ink-800 disabled:bg-ink-50 dark:bg-ink-900 dark:text-ink-100',
                              s?.tom === 'sucesso' && 'border-emerald-300 dark:border-emerald-500/50',
                              s?.tom === 'aviso' && 'border-amber-300 dark:border-amber-500/50',
                              !s && 'border-ink-200 dark:border-ink-700',
                              suja && 'ring-1 ring-brand-300 dark:ring-brand-500/50',
                            )}
                          />
                          {s && (
                            <span
                              className={cn(
                                'mt-0.5 block truncate text-center text-[10px]',
                                s.tom === 'sucesso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                              )}
                              title={s.texto}
                            >
                              {s.texto}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

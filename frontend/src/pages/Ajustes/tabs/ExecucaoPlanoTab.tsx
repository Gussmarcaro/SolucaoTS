import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatarMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { consultarExecucaoPlano } from '@/services/ajusteCsv.service';
import { CATEGORIA_DESPESA } from '@/lib/dominiosFaseV';
import type { ExecucaoPlano } from '@/types/ajusteCsv';

const rotuloCategoria = (codigo: number) =>
  CATEGORIA_DESPESA.find((c) => c.value === String(codigo))?.label ?? `Categoria ${codigo}`;

const pct = (executado: number, planejado: number) =>
  planejado > 0 ? (executado / planejado) * 100 : null;

/**
 * Execução × Plano — o termômetro do ajuste.
 *
 * Responde a pergunta que o órgão faz o ano inteiro e hoje resolve no Excel:
 * *sobrou quanto em Salários?*, *a manutenção predial estourou?*. Os dois lados
 * já estavam no sistema — o plano declara por Categoria AUDESP, a nota fiscal
 * cita uma — e faltava cruzá-los.
 *
 * O ponto não é o quadro em si: é **ver o estouro antes do Tribunal**. Depois
 * de transmitida a prestação, corrigir custa apontamento; um ano antes, custa
 * um termo aditivo.
 */
export function ExecucaoPlanoTab({ ajusteId }: { ajusteId: string }) {
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [dados, setDados] = useState<ExecucaoPlano | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const exercicio = Number(ano);
    if (!Number.isInteger(exercicio) || ano.length !== 4) return;
    let vivo = true;
    setCarregando(true);
    setErro(null);
    consultarExecucaoPlano(ajusteId, exercicio)
      .then((r) => vivo && setDados(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar a execução.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ajusteId, ano]);

  const linhas = dados?.linhas ?? [];
  const totalPlanejado = linhas.reduce((s, l) => s + l.planejado, 0);
  const totalExecutado = linhas.reduce((s, l) => s + l.executado, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-36">
          <Input
            label="Exercício"
            name="ano"
            value={ano}
            onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
          />
        </div>
        <p className="pb-2.5 text-xs text-ink-400">
          Planejado: soma anual do Plano de Aplicação. Executado: notas fiscais da prestação deste
          exercício, já pela parcela do rateio.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {erro}
        </div>
      )}

      {/* O aviso fica no topo, e só quando existe: gasto fora do plano é a
          irregularidade que a regra do plano existe para impedir. */}
      {dados?.temGastoForaDoPlano && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Há despesa executada em categoria <strong>fora do Plano de Aplicação</strong>. A
            entidade só pode executar o que está no plano — regularize por termo aditivo ou
            corrija a categoria da nota.
          </span>
        </div>
      )}

      {carregando ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : linhas.length === 0 ? (
        <div className="rounded-xl border border-ink-200 px-4 py-8 text-center text-sm text-ink-400 dark:border-ink-700">
          Nada a comparar em {ano}. Preencha o Plano de Aplicação com as Categorias de Despesa
          AUDESP e lance as notas na prestação do exercício.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
              <tr>
                <th className="px-3 py-2 font-medium">Categoria de Despesa AUDESP</th>
                <th className="w-40 px-3 py-2 text-right font-medium">Planejado</th>
                <th className="w-40 px-3 py-2 text-right font-medium">Executado</th>
                <th className="w-40 px-3 py-2 text-right font-medium">Saldo</th>
                <th className="w-32 px-3 py-2 text-right font-medium">% do plano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {linhas.map((l) => {
                const saldo = l.planejado - l.executado;
                const estourou = l.executado > l.planejado;
                const foraDoPlano = l.planejado === 0 && l.executado > 0;
                const p = pct(l.executado, l.planejado);
                return (
                  <tr key={l.categoriaDespesaTipo} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                    <td className="px-3 py-2">
                      <p className="truncate text-ink-800 dark:text-ink-100" title={rotuloCategoria(l.categoriaDespesaTipo)}>
                        {rotuloCategoria(l.categoriaDespesaTipo)}
                      </p>
                      {/* As rubricas que compõem a linha: o código sozinho não
                          diz de que despesa se trata para quem preencheu o plano. */}
                      {l.rubricas.length > 0 ? (
                        <p className="truncate text-xs text-ink-400" title={l.rubricas.join(' · ')}>
                          {l.rubricas.join(' · ')}
                        </p>
                      ) : (
                        <Badge tone="warning">Fora do plano</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-600 dark:text-ink-300">
                      {l.planejado > 0 ? formatarMoeda(l.planejado) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-800 dark:text-ink-100">
                      {formatarMoeda(l.executado)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        estourou
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {foraDoPlano ? '—' : formatarMoeda(saldo)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p == null ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        <Barra percentual={p} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-ink-200 bg-ink-50/70 dark:border-ink-700 dark:bg-ink-800/40">
              <tr className="font-semibold text-ink-900 dark:text-ink-50">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalPlanejado)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalExecutado)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatarMoeda(totalPlanejado - totalExecutado)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totalPlanejado > 0
                    ? `${((totalExecutado / totalPlanejado) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-400">
        Uma nota lançada em <strong>Financeiro → Despesas</strong> e ainda não apropriada por
        nenhuma prestação não entra nesta conta: até que alguém a inclua, ela não pertence a este
        ajuste.
      </p>
    </div>
  );
}

/**
 * A barra de consumo.
 *
 * O número diz quanto; a barra diz de relance **quais linhas olhar**. Vermelho
 * a partir de 100%, âmbar de 90 a 100 — a faixa em que ainda dá para corrigir
 * por aditivo, que é o único momento em que a informação vale alguma coisa.
 */
function Barra({ percentual }: { percentual: number }) {
  const cor =
    percentual > 100 ? 'bg-red-500' : percentual >= 90 ? 'bg-amber-500' : 'bg-emerald-500';
  const texto =
    percentual > 100 ? 'text-red-600 dark:text-red-400' : percentual >= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-ink-600 dark:text-ink-300';
  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`tabular-nums ${texto}`}>
        {percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
        <span
          className={`block h-full rounded-full ${cor}`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </span>
    </div>
  );
}

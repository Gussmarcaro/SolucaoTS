import { useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatarMoeda, mascaraMoeda, moedaParaNumero } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { salvarPlanoDigitado } from '@/services/ajusteCsv.service';
import { PLANO_PADRAO } from '@/lib/planoPadrao';
import type { PlanoItem } from '@/types/ajusteCsv';

/** Chave de uma rubrica dentro do estado — categoria e subcategoria juntas. */
const chave = (categoria: string, subcategoria: string) => `${categoria}||${subcategoria}`;

/**
 * Plano de Aplicação digitado, no formato do papel.
 *
 * Antes só havia importação de CSV, o que obrigava quem tem o plano numa
 * planilha comum — ou no PDF do ajuste — a montar um arquivo só para o sistema.
 * O CSV continua: ele é o caminho de quem tem valor variando mês a mês, e de
 * quem usa rubricas fora deste padrão.
 *
 * Aqui digita-se **um valor mensal por rubrica**, e o anual é mensal × 12 — que
 * é como o modelo é preenchido. Quem precisa de meses diferentes entre si usa o
 * CSV; misturar as duas formas na mesma grade daria 12 colunas para preencher
 * um plano que, na prática, repete o mesmo número doze vezes.
 */
export function PlanoDigitado({
  ajusteId,
  itens,
  anoSugerido,
  onSalvo,
}: {
  ajusteId: string;
  /** O plano já gravado — a grade abre preenchida com ele. */
  itens: PlanoItem[];
  anoSugerido: number;
  onSalvo: () => void;
}) {
  /*
   * O que já está gravado volta para a grade como valor mensal.
   *
   * O plano é gravado mês a mês; aqui interessa o mensal. Uso o **maior** valor
   * do ano, e não a média: um plano importado por CSV pode ter meses zerados
   * (vigência começando em julho), e a média mostraria um número que não
   * corresponde a mês nenhum.
   */
  const iniciais = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of itens) {
      const k = chave(i.categoria, i.subcategoria);
      mapa.set(k, Math.max(mapa.get(k) ?? 0, i.valor));
    }
    return mapa;
  }, [itens]);

  const [ano, setAno] = useState(String(itens[0]?.ano ?? anoSugerido));
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const [k, v] of iniciais) inicial[k] = v ? v.toFixed(2).replace('.', ',') : '';
    return inicial;
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mensalDe = (k: string) => moedaParaNumero(valores[k] ?? '');

  const totalMensal = Object.keys(valores).reduce((s, k) => s + mensalDe(k), 0);

  async function salvar() {
    setErro(null);
    const linhas = PLANO_PADRAO.flatMap((g) =>
      g.subcategorias.map((s) => ({
        categoria: g.categoria,
        subcategoria: s,
        valorMensal: mensalDe(chave(g.categoria, s)),
      })),
    ).filter((l) => l.valorMensal > 0);

    if (!linhas.length) return setErro('Informe ao menos uma rubrica com valor maior que zero.');

    setSalvando(true);
    try {
      await salvarPlanoDigitado(ajusteId, { ano: Number(ano), itens: linhas });
      onSalvo();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o plano.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-36">
          <Input
            label="Exercício *"
            name="ano"
            value={ano}
            onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
          />
        </div>
        <p className="pb-2.5 text-xs text-ink-400">
          Digite o valor <strong>mensal</strong> de cada rubrica. O anual é o mensal × 12, e as 12
          competências são gravadas ao salvar. Rubrica em branco não é gravada.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
            <tr>
              <th className="px-3 py-2 font-medium">Categorias e subcategorias da despesa</th>
              <th className="w-48 px-3 py-2 text-right font-medium">Mensal (R$)</th>
              <th className="w-48 px-3 py-2 text-right font-medium">Anual (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {PLANO_PADRAO.map((g) => {
              const subtotal = g.subcategorias.reduce(
                (s, sub) => s + mensalDe(chave(g.categoria, sub)),
                0,
              );
              return [
                // A linha do grupo é só totalizador — o valor se digita na
                // subcategoria, como no modelo. Somar aqui e ali daria dois
                // lugares para o mesmo número, e eles divergiriam.
                <tr key={g.categoria} className="bg-ink-50/70 font-semibold dark:bg-ink-800/40">
                  <td className="px-3 py-2 text-ink-800 dark:text-ink-100">
                    {g.numero}. {g.categoria}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-800 dark:text-ink-100">
                    {formatarMoeda(subtotal)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-800 dark:text-ink-100">
                    {formatarMoeda(subtotal * 12)}
                  </td>
                </tr>,
                ...g.subcategorias.map((sub, i) => {
                  const k = chave(g.categoria, sub);
                  const mensal = mensalDe(k);
                  return (
                    <tr key={k} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/30">
                      <td className="px-3 py-1.5 pl-8 text-ink-600 dark:text-ink-300">
                        {g.numero}.{i + 1} {sub}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          name={k}
                          value={valores[k] ?? ''}
                          onChange={(e) =>
                            setValores((v) => ({ ...v, [k]: mascaraMoeda(e.target.value) }))
                          }
                          placeholder="0,00"
                          inputMode="numeric"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink-500 dark:text-ink-400">
                        {mensal > 0 ? formatarMoeda(mensal * 12) : '—'}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
          <tfoot className="border-t-2 border-ink-200 bg-ink-50/70 dark:border-ink-700 dark:bg-ink-800/40">
            <tr className="font-semibold text-ink-900 dark:text-ink-50">
              <td className="px-3 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalMensal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalMensal * 12)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar plano'}
        </Button>
      </div>

      <p className="text-xs text-ink-400">
        Salvar <strong>substitui</strong> o plano do ajuste. É um documento, não uma lista que
        cresce: mesclar deixaria rubricas de uma versão anterior penduradas sem que ninguém
        percebesse.
      </p>
    </div>
  );
}

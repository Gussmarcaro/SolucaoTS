import { useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatarMoeda, mascaraMoeda, moedaParaNumero } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { copiarPlanoExercicio, exerciciosDoPlano, salvarPlanoDigitado } from '@/services/ajusteCsv.service';
import { CopiarExercicio } from './CopiarExercicio';
import { PLANO_PADRAO } from '@/lib/planoPadrao';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { CATEGORIA_DESPESA } from '@/lib/dominiosFaseV';
import { apenasDigitos } from '@/lib/masks';
import type { PlanoItem } from '@/types/ajusteCsv';

/** Linha da grade: uma subcategoria com seu valor e sua categoria AUDESP. */
interface Linha {
  id: string;
  subcategoria: string;
  valor: string;
  categoriaDespesa: string;
}

interface Grupo {
  id: string;
  categoria: string;
  linhas: Linha[];
}

let seq = 0;
const novoId = () => `l${++seq}`;

/**
 * Monta os grupos a partir do que está gravado, preservando a ordem.
 *
 * Sem plano gravado, o modelo de 16 seções entra como **semente** — é o que a
 * maioria usa, e começar de uma folha em branco daria mais trabalho que a
 * planilha que o sistema veio substituir.
 */
function gruposIniciais(itens: PlanoItem[]): Grupo[] {
  if (!itens.length) {
    return PLANO_PADRAO.map((g) => ({
      id: novoId(),
      categoria: g.categoria,
      linhas: g.subcategorias.map((s) => ({
        id: novoId(),
        subcategoria: s,
        valor: '',
        categoriaDespesa: '',
      })),
    }));
  }

  /*
   * O plano é gravado mês a mês; aqui interessa o mensal. Uso o **maior** valor
   * do ano, e não a média: um plano importado por CSV pode ter meses zerados
   * (vigência começando em julho), e a média mostraria um número que não
   * corresponde a mês nenhum.
   */
  const porGrupo = new Map<string, Map<string, { valor: number; categoria: number | null }>>();
  for (const i of itens) {
    if (!porGrupo.has(i.categoria)) porGrupo.set(i.categoria, new Map());
    const linhas = porGrupo.get(i.categoria)!;
    const atual = linhas.get(i.subcategoria);
    linhas.set(i.subcategoria, {
      valor: Math.max(atual?.valor ?? 0, i.valor),
      categoria: i.categoriaDespesaTipo ?? atual?.categoria ?? null,
    });
  }

  return [...porGrupo.entries()].map(([categoria, linhas]) => ({
    id: novoId(),
    categoria,
    linhas: [...linhas.entries()].map(([subcategoria, v]) => ({
      id: novoId(),
      subcategoria,
      valor: v.valor ? v.valor.toFixed(2).replace('.', ',') : '',
      categoriaDespesa: v.categoria != null ? String(v.categoria) : '',
    })),
  }));
}

/**
 * Plano de Aplicação digitado, no formato do papel.
 *
 * Antes só havia importação de CSV, o que obrigava quem tem o plano numa
 * planilha comum — ou no PDF do ajuste — a montar um arquivo só para o sistema.
 * O CSV continua: é o caminho de quem tem valor variando mês a mês.
 *
 * Digita-se **um valor mensal por rubrica**, e o anual é mensal × 12 — que é
 * como o modelo é preenchido. Quem precisa de meses diferentes entre si usa o
 * CSV; misturar as duas formas na mesma grade daria 12 colunas para preencher
 * um plano que, na prática, repete o mesmo número doze vezes.
 *
 * **As categorias e subcategorias são editáveis, e isso é o ponto.** Não existe
 * padrão: o modelo de 16 seções é o arranjo mais comum, mas cada entidade
 * apresenta o plano do seu jeito. A primeira versão desta tela travava no
 * modelo — e deixava de fora exatamente quem já tinha o plano pronto.
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
  const [ano, setAno] = useState(String(itens[0]?.ano ?? anoSugerido));
  const [grupos, setGrupos] = useState<Grupo[]>(() => gruposIniciais(itens));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mensalDe = (l: Linha) => moedaParaNumero(l.valor || '');
  const totalMensal = grupos.reduce(
    (s, g) => s + g.linhas.reduce((t, l) => t + mensalDe(l), 0),
    0,
  );

  const alterarGrupo = (gid: string, parcial: Partial<Grupo>) =>
    setGrupos((gs) => gs.map((g) => (g.id === gid ? { ...g, ...parcial } : g)));

  const alterarLinha = (gid: string, lid: string, parcial: Partial<Linha>) =>
    setGrupos((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, linhas: g.linhas.map((l) => (l.id === lid ? { ...l, ...parcial } : l)) }
          : g,
      ),
    );

  async function salvar() {
    setErro(null);

    const linhas = grupos.flatMap((g) =>
      g.linhas.map((l) => ({
        categoria: g.categoria.trim(),
        subcategoria: l.subcategoria.trim(),
        categoriaDespesaTipo: l.categoriaDespesa
          ? Number(apenasDigitos(l.categoriaDespesa))
          : null,
        valorMensal: mensalDe(l),
      })),
    );

    // Rubrica sem valor não é gravada — é linha do modelo que a entidade não
    // usa. Mas rubrica **com** valor e sem nome seria um número sem dono.
    const comValor = linhas.filter((l) => l.valorMensal > 0);
    if (!comValor.length) return setErro('Informe ao menos uma rubrica com valor maior que zero.');

    const semNome = comValor.filter((l) => !l.categoria || !l.subcategoria);
    if (semNome.length)
      return setErro('Há rubrica com valor e sem categoria ou subcategoria preenchida.');

    // A categoria AUDESP é o que liga o plano à execução: sem ela a rubrica
    // entra no plano e nenhuma nota fiscal consegue se reconhecer nela.
    const semCategoria = comValor.filter((l) => l.categoriaDespesaTipo == null);
    if (semCategoria.length)
      return setErro(
        `Informe a Categoria de Despesa AUDESP em: ${semCategoria.map((l) => l.subcategoria).join(', ')}.`,
      );

    setSalvando(true);
    try {
      await salvarPlanoDigitado(ajusteId, { ano: Number(ano), itens: comValor });
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
        <CopiarExercicio
          rotulo="plano"
          carregarExercicios={() => exerciciosDoPlano(ajusteId)}
          copiar={(p) => copiarPlanoExercicio(ajusteId, p)}
          onCopiado={onSalvo}
        />
        <p className="max-w-xl pb-2.5 text-xs text-ink-400">
          Informe a <strong>Categoria de Despesa AUDESP</strong> e o valor <strong>mensal</strong> de
          cada rubrica. O anual é o mensal × 12, e as 12 competências são gravadas ao salvar.
          Rubrica em branco não é gravada — as linhas do modelo que você não usar podem ficar
          vazias, ou ser removidas.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
            <tr>
              <th className="px-3 py-2 font-medium">Categorias e subcategorias da despesa</th>
              <th className="w-64 px-3 py-2 font-medium">Categoria Despesa AUDESP</th>
              <th className="w-40 px-3 py-2 text-right font-medium">Mensal (R$)</th>
              <th className="w-40 px-3 py-2 text-right font-medium">Anual (R$)</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {grupos.map((g, gi) => {
              const subtotal = g.linhas.reduce((s, l) => s + mensalDe(l), 0);
              return [
                // A linha do grupo é só totalizador — o valor se digita na
                // subcategoria, como no modelo. Somar aqui e ali daria dois
                // lugares para o mesmo número, e eles divergiriam.
                <tr key={g.id} className="bg-ink-50/70 font-semibold dark:bg-ink-800/40">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-ink-500 dark:text-ink-400">{gi + 1}.</span>
                      <Input
                        name={`cat-${g.id}`}
                        value={g.categoria}
                        onChange={(e) => alterarGrupo(g.id, { categoria: e.target.value })}
                        placeholder="Nome da categoria"
                      />
                    </div>
                  </td>
                  <td />
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-800 dark:text-ink-100">
                    {formatarMoeda(subtotal)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-800 dark:text-ink-100">
                    {formatarMoeda(subtotal * 12)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      title="Remover a categoria inteira"
                      onClick={() => setGrupos((gs) => gs.filter((x) => x.id !== g.id))}
                      className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>,

                ...g.linhas.map((l, li) => {
                  const mensal = mensalDe(l);
                  return (
                    <tr key={l.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/30">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2 pl-6">
                          <span className="shrink-0 text-xs text-ink-400">
                            {gi + 1}.{li + 1}
                          </span>
                          <Input
                            name={`sub-${l.id}`}
                            value={l.subcategoria}
                            onChange={(e) =>
                              alterarLinha(g.id, l.id, { subcategoria: e.target.value })
                            }
                            placeholder="Nome da subcategoria"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <SelectDominio
                          name={`audesp-${l.id}`}
                          value={apenasDigitos(l.categoriaDespesa)}
                          onChange={(v) => alterarLinha(g.id, l.id, { categoriaDespesa: v })}
                          options={CATEGORIA_DESPESA}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          name={`valor-${l.id}`}
                          value={l.valor}
                          onChange={(e) =>
                            alterarLinha(g.id, l.id, { valor: mascaraMoeda(e.target.value) })
                          }
                          placeholder="0,00"
                          inputMode="numeric"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink-500 dark:text-ink-400">
                        {mensal > 0 ? formatarMoeda(mensal * 12) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          title="Remover a subcategoria"
                          onClick={() =>
                            alterarGrupo(g.id, { linhas: g.linhas.filter((x) => x.id !== l.id) })
                          }
                          className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }),

                <tr key={`${g.id}-add`}>
                  <td colSpan={5} className="px-3 pb-2 pl-14">
                    <button
                      type="button"
                      onClick={() =>
                        alterarGrupo(g.id, {
                          linhas: [
                            ...g.linhas,
                            { id: novoId(), subcategoria: '', valor: '', categoriaDespesa: '' },
                          ],
                        })
                      }
                      className="focus-ring inline-flex items-center gap-1 rounded text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      subcategoria
                    </button>
                  </td>
                </tr>,
              ];
            })}
          </tbody>
          <tfoot className="border-t-2 border-ink-200 bg-ink-50/70 dark:border-ink-700 dark:bg-ink-800/40">
            <tr className="font-semibold text-ink-900 dark:text-ink-50">
              <td className="px-3 py-2">TOTAL</td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalMensal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalMensal * 12)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setGrupos((gs) => [
              ...gs,
              {
                id: novoId(),
                categoria: '',
                linhas: [{ id: novoId(), subcategoria: '', valor: '', categoriaDespesa: '' }],
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Acrescentar categoria
        </Button>

        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar plano'}
        </Button>
      </div>

      <p className="text-xs text-ink-400">
        As categorias e subcategorias são <strong>suas</strong> — o modelo que abre é apenas o
        arranjo mais comum. Renomeie, acrescente e remova o que precisar; o que o Tribunal
        padroniza é a <strong>Categoria de Despesa AUDESP</strong> da coluna ao lado, não o nome da
        rubrica.
      </p>

      <p className="text-xs text-ink-400">
        Salvar <strong>substitui</strong> o plano do exercício. É um documento, não uma lista que
        cresce: mesclar deixaria rubricas de uma versão anterior penduradas sem que ninguém
        percebesse.
      </p>
    </div>
  );
}

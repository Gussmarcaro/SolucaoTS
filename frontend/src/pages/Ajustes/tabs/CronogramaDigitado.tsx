import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatarMoeda, mascaraMoeda, moedaParaNumero, nomeMes } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { salvarCronogramaDigitado } from '@/services/ajusteCsv.service';
import { PLANO_PADRAO } from '@/lib/planoPadrao';
import type { CronogramaItem, PlanoItem } from '@/types/ajusteCsv';

/** Uma coluna do quadro: um mês de um exercício da vigência. */
interface Competencia {
  ano: number;
  mes: number;
}

const chaveRubrica = (categoria: string, subcategoria: string) => `${categoria}||${subcategoria}`;
const chaveCelula = (rubrica: string, c: Competencia) => `${rubrica}##${c.ano}-${c.mes}`;

/**
 * As competências da vigência do ajuste.
 *
 * O quadro do papel traz "MÊS 01..12" porque o exemplo é de um ajuste anual.
 * Aqui as colunas saem da vigência de verdade: parceria assinada em maio abre
 * em maio, e a que dura 18 meses abre 18 colunas. Fixar 12 faria o cronograma
 * mentir sobre o período — e é justamente o período que ele existe para
 * detalhar.
 *
 * O teto de 36 é proteção da tela, não regra de negócio: além disso o quadro
 * deixa de ser legível, e o caminho passa a ser o CSV.
 */
const MAX_COMPETENCIAS = 36;

export function competenciasDaVigencia(
  inicial: string | null,
  final: string | null,
  anoFallback: number,
): Competencia[] {
  if (!inicial) {
    return Array.from({ length: 12 }, (_, i) => ({ ano: anoFallback, mes: i + 1 }));
  }
  const [anoI, mesI] = inicial.split('-').map(Number);
  // Sem fim (vigência indeterminada), 12 meses a partir do início: é o que o
  // órgão consegue prever, e o resto entra por termo aditivo.
  const [anoF, mesF] = final ? final.split('-').map(Number) : [anoI + 1, mesI - 1 || 12];

  const saida: Competencia[] = [];
  let ano = anoI;
  let mes = mesI;
  while ((ano < anoF || (ano === anoF && mes <= mesF)) && saida.length < MAX_COMPETENCIAS) {
    saida.push({ ano, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return saida;
}

/**
 * Cronograma de Desembolso digitado — o Plano de Aplicação fracionado no tempo.
 *
 * O plano diz **quanto por mês em média** (anual ÷ 12). O cronograma diz
 * **quando de fato sai**, que raramente é o mesmo número todo mês: 13º em
 * dezembro, rescisões concentradas, reajuste a partir de maio. Se fossem
 * iguais, o plano já responderia — e o bloco não existiria.
 *
 * Por isso as duas primeiras colunas mostram o plano (mensal e anual) como
 * referência, e o rodapé de cada linha acusa quando a soma dos meses se afasta
 * do anual planejado. Não impede salvar: um cronograma pode legitimamente
 * somar menos que o plano enquanto está sendo montado.
 */
export function CronogramaDigitado({
  ajusteId,
  plano,
  cronograma,
  vigenciaInicial,
  vigenciaFinal,
  onSalvo,
}: {
  ajusteId: string;
  plano: PlanoItem[];
  cronograma: CronogramaItem[];
  vigenciaInicial: string | null;
  vigenciaFinal: string | null;
  onSalvo: () => void;
}) {
  const competencias = useMemo(
    () => competenciasDaVigencia(vigenciaInicial, vigenciaFinal, plano[0]?.ano ?? new Date().getFullYear()),
    [vigenciaInicial, vigenciaFinal, plano],
  );

  /*
   * As rubricas do quadro são **as do plano**, não as 16 seções inteiras.
   *
   * Cronograma de rubrica que não está no plano é dinheiro previsto para uma
   * despesa que ninguém planejou. E mostrar 45 linhas quando o plano tem 8
   * transformaria o quadro num campo de rolagem vazio.
   */
  const rubricas = useMemo(() => {
    const vistas = new Map<string, { categoria: string; subcategoria: string; mensal: number }>();
    for (const i of plano) {
      const k = chaveRubrica(i.categoria, i.subcategoria);
      const atual = vistas.get(k);
      vistas.set(k, {
        categoria: i.categoria,
        subcategoria: i.subcategoria,
        mensal: Math.max(atual?.mensal ?? 0, i.valor),
      });
    }
    // Mantém a ordem do modelo, e não a alfabética: é assim que o quadro é lido.
    const ordem = PLANO_PADRAO.flatMap((g) => g.subcategorias.map((s) => chaveRubrica(g.categoria, s)));
    return [...vistas.entries()]
      .sort(([a], [b]) => ordem.indexOf(a) - ordem.indexOf(b))
      .map(([k, v]) => ({ chave: k, ...v }));
  }, [plano]);

  const [celulas, setCelulas] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const i of cronograma) {
      if (!i.categoria || !i.subcategoria) continue; // linha agregada do CSV
      const k = chaveCelula(chaveRubrica(i.categoria, i.subcategoria), { ano: i.ano, mes: i.mes });
      inicial[k] = i.valor.toFixed(2).replace('.', ',');
    }
    return inicial;
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const valorDe = (k: string) => moedaParaNumero(celulas[k] ?? '');
  const somaDaLinha = (rubrica: string) =>
    competencias.reduce((s, c) => s + valorDe(chaveCelula(rubrica, c)), 0);
  const somaDaColuna = (c: Competencia) =>
    rubricas.reduce((s, r) => s + valorDe(chaveCelula(r.chave, c)), 0);

  const total = rubricas.reduce((s, r) => s + somaDaLinha(r.chave), 0);

  /** Espalha o mensal do plano por todas as competências, de uma vez. */
  function distribuirDoPlano() {
    const novo: Record<string, string> = {};
    for (const r of rubricas) {
      if (r.mensal <= 0) continue;
      for (const c of competencias) {
        novo[chaveCelula(r.chave, c)] = r.mensal.toFixed(2).replace('.', ',');
      }
    }
    setCelulas(novo);
  }

  async function salvar() {
    setErro(null);
    const itens = rubricas.flatMap((r) =>
      competencias
        .map((c) => ({
          categoria: r.categoria,
          subcategoria: r.subcategoria,
          ano: c.ano,
          mes: c.mes,
          valor: valorDe(chaveCelula(r.chave, c)),
        }))
        .filter((i) => i.valor > 0),
    );
    if (!itens.length) return setErro('Informe ao menos um valor no cronograma.');

    setSalvando(true);
    try {
      await salvarCronogramaDigitado(ajusteId, { itens });
      onSalvo();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o cronograma.'));
    } finally {
      setSalvando(false);
    }
  }

  if (!rubricas.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Preencha o <strong>Plano de Aplicação</strong> antes do cronograma. O cronograma detalha as
        rubricas do plano ao longo da vigência — sem ele, não há o que fracionar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-400">
          {competencias.length} competência(s), de {nomeMes(competencias[0].mes)}/{competencias[0].ano} a{' '}
          {nomeMes(competencias[competencias.length - 1].mes)}/{competencias[competencias.length - 1].ano}
          {!vigenciaInicial && ' — vigência não informada no ajuste, usando 12 meses do plano.'}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={distribuirDoPlano}>
          <Wand2 className="h-4 w-4" />
          Distribuir igualmente do plano
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
        <table className="w-full text-sm">
          <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
            <tr>
              {/* A rubrica fica presa à esquerda: com 12+ colunas, rolar
                  horizontalmente sem ela deixa o valor sem dono. */}
              <th className="sticky left-0 z-10 min-w-[260px] bg-ink-50/95 px-3 py-2 font-medium dark:bg-ink-800/95">
                Rubrica
              </th>
              <th className="min-w-[120px] px-3 py-2 text-right font-medium">Plano mensal</th>
              <th className="min-w-[130px] px-3 py-2 text-right font-medium">Plano anual</th>
              {competencias.map((c) => (
                <th key={`${c.ano}-${c.mes}`} className="min-w-[130px] px-2 py-2 text-right font-medium">
                  {nomeMes(c.mes)}/{String(c.ano).slice(2)}
                </th>
              ))}
              <th className="min-w-[140px] px-3 py-2 text-right font-medium">Total da linha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {rubricas.map((r) => {
              const soma = somaDaLinha(r.chave);
              const anual = r.mensal * 12;
              // Tolerância de um centavo: arredondamento na divisão do anual
              // não deve pintar a linha de vermelho.
              const difere = soma > 0 && Math.abs(soma - anual) > 0.01;
              return (
                <tr key={r.chave} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-ink-700 dark:bg-ink-900 dark:text-ink-200">
                    <span className="block truncate" title={`${r.categoria} — ${r.subcategoria}`}>
                      {r.subcategoria}
                    </span>
                    <span className="block truncate text-xs text-ink-400">{r.categoria}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-500 dark:text-ink-400">
                    {formatarMoeda(r.mensal)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-500 dark:text-ink-400">
                    {formatarMoeda(anual)}
                  </td>
                  {competencias.map((c) => {
                    const k = chaveCelula(r.chave, c);
                    return (
                      <td key={k} className="px-1 py-1">
                        <Input
                          name={k}
                          value={celulas[k] ?? ''}
                          onChange={(e) => setCelulas((v) => ({ ...v, [k]: mascaraMoeda(e.target.value) }))}
                          placeholder="0,00"
                          inputMode="numeric"
                          className="text-right"
                        />
                      </td>
                    );
                  })}
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${
                      difere ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-700 dark:text-ink-200'
                    }`}
                    title={difere ? `Difere do anual do plano em ${formatarMoeda(Math.abs(soma - anual))}` : ''}
                  >
                    {formatarMoeda(soma)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-ink-200 bg-ink-50/70 dark:border-ink-700 dark:bg-ink-800/40">
            <tr className="font-semibold text-ink-900 dark:text-ink-50">
              <td className="sticky left-0 z-10 bg-ink-50/95 px-3 py-2 dark:bg-ink-800/95">TOTAL</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatarMoeda(rubricas.reduce((s, r) => s + r.mensal, 0))}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatarMoeda(rubricas.reduce((s, r) => s + r.mensal * 12, 0))}
              </td>
              {competencias.map((c) => (
                <td key={`t-${c.ano}-${c.mes}`} className="px-2 py-2 text-right tabular-nums">
                  {formatarMoeda(somaDaColuna(c))}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-400">
          O total da linha em <strong className="text-amber-600 dark:text-amber-400">âmbar</strong> avisa
          que a soma dos meses se afasta do anual do plano. É aviso, não trava: o cronograma pode
          somar menos enquanto está sendo montado.
        </p>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar cronograma'}
        </Button>
      </div>
    </div>
  );
}

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatarMoeda, mascaraMoeda, moedaParaNumero } from '@/lib/masks';
import { TIPO_RETENCAO_LABEL, type TipoRetencao } from '@/types/prestacaoBlocos';

/** Uma linha do quadro; o valor fica como texto porque é campo com máscara. */
export interface LinhaRetencao {
  tipo: TipoRetencao | '';
  valor: string;
}

export const somaRetencoes = (linhas: LinhaRetencao[]): number =>
  Math.round(
    linhas.reduce((s, l) => s + (l.valor ? moedaParaNumero(l.valor) : 0), 0) * 100,
  ) / 100;

/**
 * As retenções de uma nota — uma linha por tributo.
 *
 * Era um valor e um tipo só. Mas uma nota de serviço costuma reter IRRF, PIS,
 * COFINS e CSLL ao mesmo tempo: obrigada a caber num campo, a nota somava tudo
 * e escolhia um tipo — e a guia de recolhimento saía atribuindo o total inteiro
 * a um tributo, com as outras três zeradas.
 *
 * O **líquido** aparece porque é o número que existe no mundo: é o que a
 * entidade de fato transfere ao fornecedor. Ele nunca foi gravado (o TCESP
 * recebe bruto e encargos, e o líquido é a subtração), mas era conferido à mão
 * a cada lançamento.
 */
export function QuadroRetencoes({
  linhas,
  onChange,
  valorBruto,
}: {
  linhas: LinhaRetencao[];
  onChange: (l: LinhaRetencao[]) => void;
  /** Para calcular o líquido e avisar quando a soma passa do bruto. */
  valorBruto: number;
}) {
  const alterar = (i: number, parcial: Partial<LinhaRetencao>) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, ...parcial } : l)));

  const total = somaRetencoes(linhas);
  const liquido = valorBruto - total;

  // Tributo já usado não volta a ser oferecido: a mesma retenção duas vezes na
  // mesma nota é a mesma com o valor partido, e partida ela não fecha com a
  // guia. O servidor recusa; aqui a opção simplesmente não aparece.
  const disponiveis = (atual: TipoRetencao | '') =>
    (Object.keys(TIPO_RETENCAO_LABEL) as TipoRetencao[]).filter(
      (t) => t === atual || !linhas.some((l) => l.tipo === t),
    );

  const todosUsados = linhas.length >= Object.keys(TIPO_RETENCAO_LABEL).length;

  return (
    <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
      <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
        Retenções
      </legend>

      {linhas.length === 0 ? (
        <p className="py-1 text-xs text-ink-400">
          Nenhuma retenção nesta nota. Acrescente uma para cada tributo retido — o valor líquido é
          calculado sozinho.
        </p>
      ) : (
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Select
                  label={i === 0 ? 'Tributo' : ''}
                  name={`retencaoTipo-${i}`}
                  value={l.tipo}
                  onChange={(e) => alterar(i, { tipo: e.target.value as TipoRetencao })}
                  options={disponiveis(l.tipo).map((t) => ({ value: t, label: TIPO_RETENCAO_LABEL[t] }))}
                  placeholder="—"
                />
              </div>
              <div className="sm:col-span-5">
                <Input
                  label={i === 0 ? 'Valor (R$)' : ''}
                  name={`retencaoValor-${i}`}
                  value={l.valor}
                  onChange={(e) => alterar(i, { valor: mascaraMoeda(e.target.value) })}
                  placeholder="0,00"
                  inputMode="numeric"
                />
              </div>
              <div className="flex justify-end pb-1 sm:col-span-1">
                <button
                  type="button"
                  title="Remover retenção"
                  onClick={() => onChange(linhas.filter((_, j) => j !== i))}
                  className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={todosUsados}
          onClick={() => onChange([...linhas, { tipo: '', valor: '' }])}
        >
          <Plus className="h-4 w-4" />
          Acrescentar retenção
        </Button>

        {/* O líquido só aparece quando há o que subtrair: um "líquido = bruto"
            em toda nota sem retenção seria ruído em 90% dos lançamentos. */}
        {total > 0 && (
          <div className="text-right text-sm">
            <span className="text-ink-500 dark:text-ink-400">
              Retido {formatarMoeda(total)} · líquido{' '}
            </span>
            <strong
              className={
                liquido <= 0 ? 'text-red-600 dark:text-red-400' : 'text-ink-800 dark:text-ink-100'
              }
            >
              {formatarMoeda(liquido)}
            </strong>
          </div>
        )}
      </div>

      {total > 0 && valorBruto > 0 && liquido <= 0 && (
        <p className="mt-1 text-xs font-medium text-red-500">
          As retenções somam {formatarMoeda(total)} e o valor bruto é {formatarMoeda(valorBruto)} —
          a soma precisa ser menor que o bruto.
        </p>
      )}
    </fieldset>
  );
}

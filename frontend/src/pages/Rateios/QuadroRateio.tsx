import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { IconBtn } from '@/pages/PrestacaoContas/blocos/_ui';
import {
  calcularRateio,
  percentualBr,
  type DefinicaoMetodo,
} from '@/types/rateio';
import { formatarMoeda, mascaraMoeda, moedaParaNumero } from '@/lib/masks';

/** Uma linha do quadro, como a tela a mantém enquanto o usuário digita. */
export interface LinhaQuadro {
  ajusteId: string;
  codigo: string;
  descricao: string;
  /** Texto do campo — moeda mascarada ou inteiro, conforme o método. */
  base: string;
}

interface Props {
  metodo: DefinicaoMetodo;
  linhas: LinhaQuadro[];
  onChange: (linhas: LinhaQuadro[]) => void;
  /** Ajustes disponíveis para o lookup, já sem os que estão no quadro. */
  opcoes: OpcaoCombo[];
  onAdicionar: (ajusteId: string) => void;
  onCarregarVigentes: () => void;
  carregando?: boolean;
  somenteLeitura?: boolean;
}

/** Converte o texto do campo no número que a conta usa. */
export const baseNumerica = (linha: LinhaQuadro, formato: string | null): number =>
  formato === 'MOEDA' ? moedaParaNumero(linha.base) : Number(linha.base.replace(/\D/g, '') || 0);

/**
 * Quadro de participantes — serve a **qualquer** método que tenha base.
 *
 * Não há um quadro por método: o que muda entre "pela receita" e "por número de
 * colaboradores" é o rótulo da coluna e o formato do campo, e os dois vêm da
 * definição do método. Um método novo não precisa de tela nova.
 *
 * O percentual não é digitável — é calculado a cada tecla, e o rodapé fecha
 * 100,00% por construção (ver `calcularRateio`).
 */
export function QuadroRateio({
  metodo,
  linhas,
  onChange,
  opcoes,
  onAdicionar,
  onCarregarVigentes,
  carregando,
  somenteLeitura,
}: Props) {
  const resultado = calcularRateio(
    linhas.map((l) => ({ ajusteId: l.ajusteId, base: baseNumerica(l, metodo.formato) })),
  );
  const percentualDe = (ajusteId: string) =>
    resultado.linhas.find((l) => l.ajusteId === ajusteId)?.percentualExibido ?? 0;

  const alterar = (i: number, base: string) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, base } : l)));

  const totalFormatado =
    metodo.formato === 'MOEDA'
      ? formatarMoeda(resultado.totalBase)
      : resultado.totalBase.toLocaleString('pt-BR');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
            Ajustes participantes do rateio
          </p>
          <p className="text-xs text-ink-400">
            O percentual é calculado pelo sistema: {metodo.rotuloBase!.toLowerCase()} do ajuste
            dividido pelo total.
          </p>
        </div>
        {!somenteLeitura && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCarregarVigentes} disabled={carregando}>
              Carregar ajustes vigentes
            </Button>
          </div>
        )}
      </div>

      {!somenteLeitura && (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Combobox
              label="Adicionar ajuste"
              name="adicionarAjuste"
              value=""
              onChange={(v) => v && onAdicionar(v)}
              options={opcoes}
              placeholder={
                opcoes.length ? 'Digite para localizar o ajuste...' : 'Todos os ajustes já estão no quadro'
              }
              disabled={!opcoes.length}
            />
          </div>
          <div className="pb-0.5">
            <Plus className="h-4 w-4 text-ink-400" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
            <tr>
              <th className="px-3 py-2 font-medium">Ajuste nº</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 text-right font-medium">{metodo.rotuloBase}</th>
              <th className="px-3 py-2 text-right font-medium">Percentual</th>
              {!somenteLeitura && <th className="w-16 px-3 py-2 text-center font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={somenteLeitura ? 4 : 5} className="px-3 py-8 text-center text-sm text-ink-400">
                  Nenhum ajuste no quadro. Carregue os vigentes ou adicione um acima.
                </td>
              </tr>
            ) : (
              linhas.map((l, i) => (
                <tr key={l.ajusteId} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-800 dark:text-ink-100">
                    {l.codigo}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-ink-600 dark:text-ink-300" title={l.descricao}>
                    {l.descricao}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {somenteLeitura ? (
                      <span className="tabular-nums text-ink-700 dark:text-ink-200">
                        {metodo.formato === 'MOEDA'
                          ? formatarMoeda(baseNumerica(l, metodo.formato))
                          : baseNumerica(l, metodo.formato).toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      <Input
                        name={`base-${i}`}
                        value={l.base}
                        onChange={(e) =>
                          alterar(
                            i,
                            metodo.formato === 'MOEDA'
                              ? mascaraMoeda(e.target.value)
                              : e.target.value.replace(/\D/g, ''),
                          )
                        }
                        placeholder={metodo.formato === 'MOEDA' ? '0,00' : '0'}
                        inputMode="numeric"
                        className="text-right"
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink-700 dark:text-ink-200">
                    {percentualBr(percentualDe(l.ajusteId))}
                  </td>
                  {!somenteLeitura && (
                    <td className="px-3 py-2 text-center">
                      <IconBtn
                        title="Remover do rateio"
                        danger
                        onClick={() => onChange(linhas.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {linhas.length > 0 && (
            <tfoot className="border-t-2 border-ink-200 bg-ink-50/70 dark:border-ink-700 dark:bg-ink-800/40">
              <tr className="font-semibold text-ink-800 dark:text-ink-100">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-xs font-normal text-ink-400">{metodo.rotuloTotal}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totalFormatado}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {percentualBr(resultado.totalPercentual)}
                </td>
                {!somenteLeitura && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

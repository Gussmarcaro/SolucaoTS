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

/**
 * Uma linha do quadro, como a tela a mantém enquanto o usuário digita.
 *
 * **Nem toda linha é um ajuste.** A entidade que recebe o repasse também tem
 * atividade própria — o atendimento particular, o plano de saúde, o SUS — e ela
 * consome a mesma despesa administrativa que se está rateando. Fora do quadro,
 * essa atividade não fica de fora da conta: ela encolhe o denominador e faz os
 * convênios pagarem a fatia dela.
 */
export interface LinhaQuadro {
  /**
   * Chave da linha **na tela**, não no banco.
   *
   * O `ajusteId` servia de `key`, e deixou de servir: duas origens próprias têm
   * ajuste nulo e colidiriam, fazendo o React reaproveitar a linha errada ao
   * remover uma delas — o usuário apaga "Particular" e vê sumir "Plano de
   * saúde".
   */
  id: string;
  /** Nulo quando a linha é recurso próprio da entidade. */
  ajusteId: string | null;
  /** Nome da origem própria; nulo quando a linha é um ajuste. */
  origem: string | null;
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
  /** Acrescenta uma linha de recurso próprio da entidade. */
  onAdicionarOrigem: () => void;
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
  onAdicionarOrigem,
  onCarregarVigentes,
  carregando,
  somenteLeitura,
}: Props) {
  const resultado = calcularRateio(
    linhas.map((l) => ({ ajusteId: l.ajusteId, base: baseNumerica(l, metodo.formato) })),
  );
  /*
   * Por **posição**, não por `ajusteId`.
   *
   * `calcularRateio` devolve as linhas na mesma ordem que recebeu. O
   * `find(l => l.ajusteId === …)` que havia aqui casava todas as origens
   * próprias (ajuste nulo) com a primeira delas, e a tela mostrava o mesmo
   * percentual repetido — somando mais de 100% sem nada acusar.
   */
  const percentualDe = (i: number) => resultado.linhas[i]?.percentualExibido ?? 0;

  const alterar = (i: number, base: string) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, base } : l)));

  const alterarOrigem = (i: number, origem: string) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, origem } : l)));

  const totalFormatado =
    metodo.formato === 'MOEDA'
      ? formatarMoeda(resultado.totalBase)
      : resultado.totalBase.toLocaleString('pt-BR');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
            Participantes do rateio
          </p>
          <p className="text-xs text-ink-400">
            O percentual é calculado pelo sistema: {metodo.rotuloBase!.toLowerCase()} de cada linha
            dividida pelo total. Inclua também o <strong>recurso próprio da entidade</strong> — o
            particular, o plano de saúde —, senão os convênios absorvem a fatia dele.
          </p>
        </div>
        {!somenteLeitura && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCarregarVigentes} disabled={carregando}>
              Carregar ajustes vigentes
            </Button>
            {/* A entidade também gasta com a sede. Sem esta linha o rateio
                cobra dos convênios a parte da atividade própria dela. */}
            <Button type="button" variant="secondary" size="sm" onClick={onAdicionarOrigem}>
              <Plus className="h-4 w-4" />
              Recurso próprio da entidade
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
              <th className="px-3 py-2 font-medium">Ajuste nº / Origem</th>
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
                  Nenhuma linha no quadro. Carregue os ajustes vigentes ou acrescente uma origem própria.
                </td>
              </tr>
            ) : (
              linhas.map((l, i) => (
                <tr key={l.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  {/* A origem própria se identifica pelo nome, e o nome é
                      digitado: "Particular", "Plano de saúde", "SUS". O ajuste
                      se identifica pelo código, que vem do cadastro. */}
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-ink-800 dark:text-ink-100">
                    {l.ajusteId ? (
                      <span className="font-mono">{l.codigo}</span>
                    ) : somenteLeitura ? (
                      <span>{l.origem}</span>
                    ) : (
                      <Input
                        name={`origem-${i}`}
                        value={l.origem ?? ''}
                        onChange={(e) => alterarOrigem(i, e.target.value)}
                        placeholder="Particular, plano de saúde…"
                      />
                    )}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-ink-600 dark:text-ink-300" title={l.descricao}>
                    {l.ajusteId ? (
                      l.descricao
                    ) : (
                      <span className="text-ink-400">
                        recurso próprio da entidade — entra na conta, mas não é pago por parceria
                      </span>
                    )}
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
                    {percentualBr(percentualDe(i))}
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

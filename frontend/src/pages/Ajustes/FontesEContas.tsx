import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { IconBtn } from '@/pages/PrestacaoContas/blocos/_ui';
import { BANCO, CONTA_TIPO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { apenasDigitos } from '@/lib/masks';
import type { ContaBancariaAjuste } from '@/types/ajuste';

interface Props {
  fontes: number[];
  onFontes: (v: number[]) => void;
  contas: ContaBancariaAjuste[];
  onContas: (v: ContaBancariaAjuste[]) => void;
}

const rotuloDominio = (opcoes: { value: string; label: string }[], codigo: number | null) =>
  opcoes.find((o) => o.value === String(codigo))?.label ?? String(codigo ?? '');

/**
 * Fontes de recurso e contas bancárias do ajuste.
 *
 * O que se ganha declarando isto aqui: no lançamento do pagamento, em vez das
 * 16 fontes da tabela e de banco/agência/conta digitados à mão, aparecem só as
 * do ajuste. Fonte errada não é recusada no envio — o código existe na tabela —,
 * então sem esta lista o erro só apareceria na análise do Tribunal.
 *
 * As fontes são **obrigatórias**; as contas, não. Restringir a conta do
 * pagamento só faz sentido quando há contas cadastradas, e exigi-las trancaria
 * o ajuste de quem ainda não as tem.
 */
export function FontesEContas({ fontes, onFontes, contas, onContas }: Props) {
  const disponiveis = FONTE_RECURSO.filter((o) => !fontes.includes(Number(o.value)));

  const alterarConta = (i: number, parcial: Partial<ContaBancariaAjuste>) =>
    onContas(contas.map((c, j) => (j === i ? { ...c, ...parcial } : c)));

  return (
    <div className="space-y-5">
      {/* ---- Fontes ---- */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <SelectDominio
              label="Acrescentar fonte de recurso"
              name="novaFonte"
              value=""
              onChange={(v) => v && onFontes([...fontes, Number(apenasDigitos(v))].sort((a, b) => a - b))}
              options={disponiveis}
            />
          </div>
          {!disponiveis.length && (
            <p className="pb-2.5 text-xs text-ink-400">Todas as fontes já foram acrescentadas.</p>
          )}
        </div>

        {fontes.length === 0 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Nenhuma fonte informada. O ajuste precisa de ao menos uma — é ela que o pagamento vai
            poder usar.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {fontes.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/70 py-1 pl-2.5 pr-1 text-xs text-ink-700 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-200"
              >
                <span className="max-w-[320px] truncate" title={rotuloDominio(FONTE_RECURSO, f)}>
                  {rotuloDominio(FONTE_RECURSO, f)}
                </span>
                <IconBtn
                  title="Remover fonte"
                  danger
                  onClick={() => onFontes(fontes.filter((x) => x !== f))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Contas ---- */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Contas bancárias</p>
            <p className="text-xs text-ink-400">
              Opcionais. Cadastradas aqui, o pagamento escolhe entre elas em vez de redigitar
              banco, agência e conta.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onContas([...contas, { banco: 0, agencia: 0, conta: '', contaTipo: null, apelido: null }])
            }
          >
            <Plus className="h-4 w-4" />
            Acrescentar conta
          </Button>
        </div>

        {contas.length === 0 ? (
          <p className="text-xs text-ink-400">Nenhuma conta cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {contas.map((c, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <SelectDominio
                    label={i === 0 ? 'Banco *' : ''}
                    name={`banco-${i}`}
                    value={c.banco ? String(c.banco) : ''}
                    onChange={(v) => alterarConta(i, { banco: Number(apenasDigitos(v)) || 0 })}
                    options={BANCO}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={i === 0 ? 'Agência *' : ''}
                    name={`agencia-${i}`}
                    value={c.agencia ? String(c.agencia) : ''}
                    onChange={(e) => alterarConta(i, { agencia: Number(apenasDigitos(e.target.value)) || 0 })}
                    inputMode="numeric"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={i === 0 ? 'Conta *' : ''}
                    name={`conta-${i}`}
                    value={c.conta}
                    onChange={(e) => alterarConta(i, { conta: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <SelectDominio
                    label={i === 0 ? 'Tipo' : ''}
                    name={`contaTipo-${i}`}
                    value={c.contaTipo != null ? String(c.contaTipo) : ''}
                    onChange={(v) => alterarConta(i, { contaTipo: v ? Number(apenasDigitos(v)) : null })}
                    options={CONTA_TIPO}
                  />
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <IconBtn title="Remover conta" danger onClick={() => onContas(contas.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

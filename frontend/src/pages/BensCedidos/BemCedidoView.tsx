import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda } from '@/lib/masks';
import type { BemCedido } from '@/types/bemCedido';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function BemCedidoView({ bem }: { bem: BemCedido }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{bem.descricao}</h3>
        <p className="text-sm text-ink-500">{bem.tipo}</p>
        <div className="mt-1">
          <Badge tone={bem.ativo ? 'success' : 'neutral'}>{bem.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="Identificador" valor={bem.identificador} />
        <Campo label="Valor" valor={formatarMoeda(bem.valor)} />
        <Campo label="Cessão" valor={dataBr(bem.dataCessao)} />
        <Campo label="Devolução" valor={bem.dataDevolucao ? dataBr(bem.dataDevolucao) : null} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Observação" valor={bem.observacao} />
        </div>
      </dl>
    </div>
  );
}

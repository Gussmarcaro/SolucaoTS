import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda } from '@/lib/masks';
import {
  PERIODICIDADE_LABEL,
  STATUS_AJUSTE_LABEL,
  TIPO_AJUSTE_LABEL,
  type Ajuste,
} from '@/types/ajuste';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function AjusteView({ ajuste }: { ajuste: Ajuste }) {
  const vigencia =
    ajuste.vigenciaInicial || ajuste.vigenciaFinal
      ? `${ajuste.vigenciaInicial ? dataBr(ajuste.vigenciaInicial) : '—'} — ${
          ajuste.vigenciaFinal ? dataBr(ajuste.vigenciaFinal) : 'Indeterminada'
        }`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-mono text-base font-semibold text-ink-900 dark:text-ink-50">{ajuste.codigoAjuste}</h3>
          <p className="text-sm text-ink-500">{ajuste.entidadeNome}</p>
          <div className="mt-1 flex gap-2">
            <Badge tone="brand">{TIPO_AJUSTE_LABEL[ajuste.tipoAjuste]}</Badge>
            <Badge tone={ajuste.status === 'ENVIADO' ? 'success' : 'warning'}>
              {STATUS_AJUSTE_LABEL[ajuste.status]}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Órgão prestador" valor={ajuste.orgaoNome} />
        </div>
        <Campo label="Número interno" valor={ajuste.numero} />
        <Campo label="Valor Global" valor={formatarMoeda(ajuste.valorGlobal)} />
        <Campo label="Periodicidade" valor={PERIODICIDADE_LABEL[ajuste.periodicidade]} />
        <Campo label="Assinatura" valor={dataBr(ajuste.dataAssinatura)} />
        <div className="col-span-2 sm:col-span-2">
          <Campo label="Vigência" valor={vigencia} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Objeto" valor={ajuste.objeto} />
        </div>
      </dl>
    </div>
  );
}

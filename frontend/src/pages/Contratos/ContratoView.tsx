import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import type { Contrato } from '@/types/contrato';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function ContratoView({ contrato }: { contrato: Contrato }) {
  const vigencia = `${dataBr(contrato.vigenciaInicio)} — ${
    contrato.vigenciaFim ? dataBr(contrato.vigenciaFim) : 'Indeterminada'
  }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">Contrato nº {contrato.numero}</h3>
          <p className="text-sm text-ink-500">{contrato.credorNome}</p>
          <div className="mt-1">
            <Badge tone={contrato.ativo ? 'success' : 'neutral'}>
              {contrato.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label={contrato.credorDocumentoTipo} valor={mascaraCpfCnpj(contrato.credorDocumento)} />
        <Campo label="Natureza" valor={contrato.naturezaContratacao} />
        <Campo label="Valor" valor={formatarMoeda(contrato.valorMontante)} />
        <Campo label="Assinatura" valor={dataBr(contrato.dataAssinatura)} />
        <div className="col-span-2 sm:col-span-2">
          <Campo label="Vigência" valor={vigencia} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Objeto" valor={contrato.objeto} />
        </div>
      </dl>
    </div>
  );
}

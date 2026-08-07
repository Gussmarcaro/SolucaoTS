import { Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { mascaraCpfCnpj } from '@/lib/masks';
import { TIPO_ORGAO_LABEL, PERIODICIDADE_LABEL, type Orgao } from '@/types/orgao';

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor}</dd>
    </div>
  );
}

export function OrgaoView({ orgao }: { orgao: Orgao }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <Landmark className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{orgao.nome}</h3>
          <p className="text-sm text-ink-500">{TIPO_ORGAO_LABEL[orgao.tipoOrgao] ?? orgao.tipoOrgao}</p>
          <div className="mt-1">
            <Badge tone={orgao.ativo ? 'success' : 'neutral'}>{orgao.ativo ? 'Ativo' : 'Inativo'}</Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo rotulo="Código do Município (TCESP)" valor={String(orgao.codigoMunicipio)} />
        <Campo rotulo="Código da Entidade (TCESP)" valor={String(orgao.codigoEntidade)} />
        <Campo rotulo="Periodicidade (Declaração Negativa)" valor={PERIODICIDADE_LABEL[orgao.periodicidade] ?? orgao.periodicidade} />
        <Campo rotulo="CNPJ" valor={mascaraCpfCnpj(orgao.cnpj)} />
      </dl>
    </div>
  );
}

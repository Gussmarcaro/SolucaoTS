import { Autoria } from '@/components/ui/Autoria';
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
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{orgao.nome}</h3>
        <p className="text-sm text-ink-500">{TIPO_ORGAO_LABEL[orgao.tipoOrgao] ?? orgao.tipoOrgao}</p>
        <div className="mt-1">
          <Badge tone={orgao.ativo ? 'success' : 'neutral'}>{orgao.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo rotulo="Código Município" valor={String(orgao.codigoMunicipio)} />
        <Campo rotulo="Código Entidade" valor={String(orgao.codigoEntidade)} />
        <Campo rotulo="Periodicidade (Declaração Negativa)" valor={PERIODICIDADE_LABEL[orgao.periodicidade] ?? orgao.periodicidade} />
        <Campo rotulo="CNPJ" valor={mascaraCpfCnpj(orgao.cnpj)} />
      </dl>

      <Autoria entidade="Cliente" id={orgao.id} />
    </div>
  );
}

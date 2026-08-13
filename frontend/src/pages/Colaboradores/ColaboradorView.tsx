import { Autoria } from '@/components/ui/Autoria';
import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import type { Colaborador } from '@/types/colaborador';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function ColaboradorView({ colaborador }: { colaborador: Colaborador }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{colaborador.nome}</h3>
        <p className="text-sm text-ink-500">{colaborador.cargo}</p>
        <div className="mt-1">
          <Badge tone={colaborador.ativo ? 'success' : 'neutral'}>
            {colaborador.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="CPF" valor={mascaraCpfCnpj(colaborador.cpf)} />
        <Campo label="CBO" valor={colaborador.cbo} />
        <Campo label="CNS" valor={colaborador.cns} />
        <Campo label="Admissão" valor={dataBr(colaborador.dataAdmissao)} />
        <Campo label="Demissão" valor={colaborador.dataDemissao ? dataBr(colaborador.dataDemissao) : null} />
        <Campo label="Salário Contratual" valor={formatarMoeda(colaborador.salarioContratual)} />
      </dl>

      <Autoria entidade="Colaborador" id={colaborador.id} />
    </div>
  );
}

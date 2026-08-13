import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import type { ServidorCedido } from '@/types/servidorCedido';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function ServidorCedidoView({ servidor }: { servidor: ServidorCedido }) {
  const vigencia = `${dataBr(servidor.dataInicialCessao)} — ${
    servidor.dataFinalCessao ? dataBr(servidor.dataFinalCessao) : 'Em vigor'
  }`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{servidor.nome}</h3>
        <p className="text-sm text-ink-500">{servidor.cargoPublico}</p>
        <div className="mt-1">
          <Badge tone={servidor.ativo ? 'success' : 'neutral'}>
            {servidor.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="CPF" valor={mascaraCpfCnpj(servidor.cpf)} />
        <Campo label="Função na Entidade" valor={servidor.funcaoEntidade} />
        <Campo label="Ônus do Pagamento" valor={servidor.onusPagamento} />
        <Campo label="Carga Horária" valor={servidor.cargaHoraria != null ? `${servidor.cargaHoraria} h/sem` : null} />
        <Campo label="Remuneração Bruta" valor={formatarMoeda(servidor.remuneracaoBruta)} />
        <Campo label="Cessão" valor={vigencia} />
      </dl>
    </div>
  );
}

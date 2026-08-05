import { Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { mascaraCep, mascaraCelular, mascaraCpfCnpj, mascaraTelefoneFixo } from '@/lib/masks';
import type { Entidade } from '@/types/entidade';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function EntidadeView({ entidade }: { entidade: Entidade }) {
  const endereco = [entidade.logradouro, entidade.numero, entidade.complemento]
    .filter(Boolean)
    .join(', ');
  const constituicao = entidade.dataConstituicao
    ? new Date(entidade.dataConstituicao).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <Landmark className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{entidade.razaoSocial}</h3>
          {entidade.nomeFantasia && <p className="text-sm text-ink-500">{entidade.nomeFantasia}</p>}
          <div className="mt-1">
            <Badge tone={entidade.ativo ? 'success' : 'neutral'}>
              {entidade.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="CNPJ" valor={mascaraCpfCnpj(entidade.cnpj)} />
        <Campo label="Inscrição Estadual" valor={entidade.inscricaoEstadual} />
        <Campo label="Inscrição Municipal" valor={entidade.inscricaoMunicipal} />
        <Campo label="Data de Constituição" valor={constituicao} />
        <Campo label="E-mail" valor={entidade.email} />
        <Campo label="Telefone Fixo" valor={entidade.telefoneFixo ? mascaraTelefoneFixo(entidade.telefoneFixo) : null} />
        <Campo label="Celular / WhatsApp" valor={entidade.whatsapp ? mascaraCelular(entidade.whatsapp) : null} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Endereço" valor={endereco} />
        </div>
        <Campo label="Bairro" valor={entidade.bairro} />
        <Campo label="Cidade / UF" valor={`${entidade.cidade} / ${entidade.uf}`} />
        <Campo label="CEP" valor={mascaraCep(entidade.cep)} />
      </dl>
    </div>
  );
}

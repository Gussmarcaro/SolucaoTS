import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { mascaraCep, mascaraCelular, mascaraCpfCnpj, mascaraTelefoneFixo } from '@/lib/masks';
import { resolverUrlLogo } from '@/services/empresas.service';
import type { Empresa } from '@/types/empresa';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function EmpresaView({ empresa }: { empresa: Empresa }) {
  const logo = resolverUrlLogo(empresa.logoUrl);
  const endereco = [empresa.logradouro, empresa.numero, empresa.complemento]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-ink-50 dark:bg-ink-800">
          {logo ? (
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-7 w-7 text-ink-300" />
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{empresa.razaoSocial}</h3>
          {empresa.nomeFantasia && <p className="text-sm text-ink-500">{empresa.nomeFantasia}</p>}
          <div className="mt-1">
            <Badge tone={empresa.ativo ? 'success' : 'neutral'}>
              {empresa.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="CNPJ" valor={mascaraCpfCnpj(empresa.cnpj)} />
        <Campo label="Inscrição Estadual" valor={empresa.inscricaoEstadual} />
        <Campo label="Inscrição Municipal" valor={empresa.inscricaoMunicipal} />
        <Campo label="E-mail" valor={empresa.email} />
        <Campo label="Telefone Fixo" valor={empresa.telefoneFixo ? mascaraTelefoneFixo(empresa.telefoneFixo) : null} />
        <Campo label="WhatsApp" valor={empresa.whatsapp ? mascaraCelular(empresa.whatsapp) : null} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Endereço" valor={endereco} />
        </div>
        <Campo label="Bairro" valor={empresa.bairro} />
        <Campo label="Cidade / UF" valor={`${empresa.cidade} / ${empresa.uf}`} />
        <Campo label="CEP" valor={mascaraCep(empresa.cep)} />
      </dl>
    </div>
  );
}

import { Autoria } from '@/components/ui/Autoria';
import { Badge } from '@/components/ui/Badge';
import { mascaraCep, mascaraCelular, mascaraCpfCnpj, mascaraTelefoneFixo } from '@/lib/masks';
import type { Fornecedor } from '@/types/fornecedor';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function FornecedorView({ fornecedor }: { fornecedor: Fornecedor }) {
  const endereco = [fornecedor.logradouro, fornecedor.numero, fornecedor.complemento]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{fornecedor.nome}</h3>
        <p className="text-sm text-ink-500">{fornecedor.email}</p>
        <div className="mt-1">
          <Badge tone={fornecedor.ativo ? 'success' : 'neutral'}>
            {fornecedor.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label={fornecedor.documentoTipo} valor={mascaraCpfCnpj(fornecedor.documento)} />
        <Campo label="Inscrição Estadual" valor={fornecedor.inscricaoEstadual} />
        <Campo label="Telefone Fixo" valor={fornecedor.telefoneFixo ? mascaraTelefoneFixo(fornecedor.telefoneFixo) : null} />
        <Campo label="Celular / WhatsApp" valor={fornecedor.whatsapp ? mascaraCelular(fornecedor.whatsapp) : null} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Endereço" valor={endereco} />
        </div>
        <Campo label="Bairro" valor={fornecedor.bairro} />
        <Campo label="Cidade / UF" valor={`${fornecedor.cidade} / ${fornecedor.uf}`} />
        <Campo label="CEP" valor={mascaraCep(fornecedor.cep)} />
      </dl>

      <Autoria entidade="Fornecedor" id={fornecedor.id} />
    </div>
  );
}

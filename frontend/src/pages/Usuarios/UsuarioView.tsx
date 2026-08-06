import { User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { mascaraCelular, mascaraCep, mascaraCpfCnpj } from '@/lib/masks';
import type { Usuario } from '@/types/usuario';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function UsuarioView({ usuario }: { usuario: Usuario }) {
  const endereco = [usuario.logradouro, usuario.numero, usuario.complemento]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{usuario.nome}</h3>
          <p className="text-sm text-ink-500">{usuario.email}</p>
          <div className="mt-1">
            <Badge tone={usuario.ativo ? 'success' : 'neutral'}>
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label={usuario.documentoTipo} valor={mascaraCpfCnpj(usuario.documento)} />
        <Campo label="Grupo de Usuários" valor={usuario.grupoNome} />
        <Campo label="Celular" valor={mascaraCelular(usuario.celular)} />
        <Campo label="CEP" valor={mascaraCep(usuario.cep)} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Endereço" valor={endereco} />
        </div>
        <Campo label="Bairro" valor={usuario.bairro} />
        <Campo label="Cidade / UF" valor={`${usuario.cidade} / ${usuario.uf}`} />
      </dl>
    </div>
  );
}

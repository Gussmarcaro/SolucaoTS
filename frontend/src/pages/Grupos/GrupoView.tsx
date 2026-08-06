import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Grupo } from '@/types/grupo';

export function GrupoView({ grupo }: { grupo: Grupo }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{grupo.nome}</h3>
          <p className="text-sm text-ink-500">{grupo.totalMembros} usuário(s) vinculado(s)</p>
          <div className="mt-1">
            <Badge tone={grupo.ativo ? 'success' : 'neutral'}>{grupo.ativo ? 'Ativo' : 'Inativo'}</Badge>
          </div>
        </div>
      </div>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">Descrição</dt>
        <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{grupo.descricao?.trim() || '—'}</dd>
      </div>
    </div>
  );
}

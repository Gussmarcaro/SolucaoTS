import { Badge } from '@/components/ui/Badge';
import type { Grupo } from '@/types/grupo';

export function GrupoView({ grupo }: { grupo: Grupo }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{grupo.nome}</h3>
        <p className="text-sm text-ink-500">{grupo.totalMembros} usuário(s) vinculado(s)</p>
        <div className="mt-1">
          <Badge tone={grupo.ativo ? 'success' : 'neutral'}>{grupo.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </div>
      </div>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">Descrição</dt>
        <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{grupo.descricao?.trim() || '—'}</dd>
      </div>
    </div>
  );
}

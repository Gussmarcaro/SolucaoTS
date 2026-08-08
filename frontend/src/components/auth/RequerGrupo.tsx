import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

/** Compara nomes de grupo ignorando acento e caixa. */
const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Bloqueia a página para quem não é dos grupos informados.
 *
 * Esconder o item no menu não basta: sem isto, bastaria digitar a URL. Ainda
 * assim é a segunda linha — quem realmente barra é o backend, que devolve 403.
 */
export function RequerGrupo({ grupos, children }: { grupos: string[]; children: ReactNode }) {
  const { usuario } = useAuth();
  const permitidos = grupos.map(normalizar);
  const autorizado = !!usuario?.grupo && permitidos.includes(normalizar(usuario.grupo));

  if (autorizado) return <>{children}</>;

  return (
    <>
      <PageHeader title="Acesso restrito" />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200/70 bg-white py-16 text-center shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <ShieldAlert className="h-8 w-8 text-ink-300" />
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Esta página é restrita aos grupos {grupos.join(' e ')}.
        </p>
        <p className="text-xs text-ink-400">
          Fale com o administrador se precisar de acesso.
        </p>
      </div>
    </>
  );
}

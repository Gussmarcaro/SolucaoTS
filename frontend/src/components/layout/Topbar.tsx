import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface TopbarProps {
  onOpenSidebar: () => void;
}

function iniciais(nome?: string): string {
  if (!nome) return 'US';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { usuario, sair } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/70 sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="focus-ring rounded-xl p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Busca */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Buscar ajustes, entidades, tarefas..."
          className="focus-ring h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:flex-none">
        <ThemeToggle />

        <button
          className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-950" />
        </button>

        <div className="mx-1 hidden h-6 w-px bg-ink-200 dark:bg-ink-800 sm:block" />

        {/* Perfil */}
        <div className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 sm:pr-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            {iniciais(usuario?.nome)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[160px] truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
              {usuario?.nome ?? 'Usuário'}
            </span>
            <span className="block max-w-[160px] truncate text-[11px] text-ink-400">
              {usuario?.email ?? ''}
            </span>
          </span>
        </div>

        <button
          onClick={sair}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-ink-400 dark:hover:bg-red-500/10"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}

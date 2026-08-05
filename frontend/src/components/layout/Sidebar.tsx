import { X, Menu } from 'lucide-react';
import { NavMenu } from './NavMenu';
import { cn } from '@/lib/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <>
      {/* Overlay no mobile */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          // Claro: gradiente azul da marca. Escuro: fundo grafite (ink-900).
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-gradient-to-b from-brand-500 to-brand-700 text-white transition-[width,transform] duration-300',
          'dark:bg-none dark:bg-ink-900 dark:text-ink-100 dark:border-r dark:border-ink-800/70',
          'lg:translate-x-0',
          collapsed && 'lg:w-[76px]', // recolhido (apenas desktop)
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Cabeçalho: logo + botão de recolher/expandir */}
        <div
          className={cn(
            'relative flex h-24 items-center justify-between px-4',
            collapsed && 'lg:justify-center lg:px-2',
          )}
        >
          {/* Logo (oculta no desktop quando recolhido) */}
          <div className={cn('flex items-center', collapsed && 'lg:hidden')}>
            <img
              src="/logo-menu.png"
              alt="Solução TS"
              className="h-16 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-menu-dark.png"
              alt="Solução TS"
              className="hidden h-16 w-auto object-contain dark:block"
            />
          </div>

          {/* Botão hambúrguer: recolher/expandir (somente desktop) */}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="focus-ring hidden rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 lg:inline-flex"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Botão fechar (somente mobile) */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="focus-ring rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className={cn('flex-1 overflow-y-auto px-3 py-4', collapsed && 'lg:px-2')}>
          <NavMenu
            collapsed={collapsed}
            onNavigate={onClose}
            onExpandSidebar={() => {
              if (collapsed) onToggleCollapse();
            }}
          />
        </nav>
      </aside>
    </>
  );
}

import { NavLink } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import { navigation } from '@/lib/navigation';
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
              src="/logo-branca-azulescuro.png"
              alt="Solução TS"
              className="mt-1 h-14 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-branca-azulescuro-dark.png"
              alt="Solução TS"
              className="mt-1 hidden h-14 w-auto object-contain dark:block"
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
        <nav className={cn('flex-1 space-y-6 overflow-y-auto px-3 py-4', collapsed && 'lg:px-2')}>
          {navigation.map((group) => (
            <div key={group.title}>
              <p
                className={cn(
                  'px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 dark:text-ink-400',
                  collapsed && 'lg:hidden',
                )}
              >
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
                          isActive
                            ? 'bg-white/20 text-white shadow-soft dark:bg-brand-500/15 dark:text-brand-200 dark:shadow-none'
                            : 'text-white/80 hover:bg-white/10 hover:text-white dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-50',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0 transition-colors',
                              isActive
                                ? 'text-white dark:text-brand-300'
                                : 'text-white/70 group-hover:text-white dark:text-ink-400 dark:group-hover:text-ink-200',
                            )}
                          />
                          <span className={cn('flex-1', collapsed && 'lg:hidden')}>{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white dark:bg-ink-700/60 dark:text-ink-200',
                                collapsed && 'lg:hidden',
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

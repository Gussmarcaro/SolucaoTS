import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { navigation, type NavNode } from '@/lib/navigation';
import { cn } from '@/lib/cn';

interface Props {
  collapsed: boolean;
  onNavigate: () => void;
  onExpandSidebar: () => void;
}

function rotaAtiva(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

/** Retorna os rótulos dos grupos que são ancestrais da rota ativa. */
function caminhoAtivo(nodes: NavNode[], pathname: string): string[] | null {
  for (const n of nodes) {
    if (n.to && rotaAtiva(n.to, pathname)) return [];
    if (n.children) {
      const sub = caminhoAtivo(n.children, pathname);
      if (sub) return [n.label, ...sub];
    }
  }
  return null;
}

function grupoContémAtivo(node: NavNode, pathname: string): boolean {
  if (node.to && rotaAtiva(node.to, pathname)) return true;
  return (node.children ?? []).some((c) => grupoContémAtivo(c, pathname));
}

const linhaBase =
  'focus-ring group flex w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors';
const inativo =
  'text-white/80 hover:bg-white/10 hover:text-white dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-50';
const ativo = 'bg-white/20 text-white dark:bg-brand-500/15 dark:text-brand-200';

function Marcador({ node }: { node: NavNode }) {
  if (node.icon) return <node.icon className="h-[18px] w-[18px] shrink-0" />;
  return <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />;
}

export function NavMenu({ collapsed, onNavigate, onExpandSidebar }: Props) {
  const { pathname } = useLocation();
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(caminhoAtivo(navigation, pathname) ?? []));

  // Ao navegar, garante que o ramo da rota ativa esteja aberto.
  useEffect(() => {
    const ramo = caminhoAtivo(navigation, pathname);
    if (ramo?.length) setAbertos((prev) => new Set([...prev, ...ramo]));
  }, [pathname]);

  const toggle = (label: string) =>
    setAbertos((prev) => {
      const n = new Set(prev);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });

  // ---- Modo recolhido (desktop): só o topo, em ícones ----
  if (collapsed) {
    return (
      <ul className="hidden space-y-1 lg:block">
        {navigation.map((node) => (
          <li key={node.label}>
            {node.to ? (
              <NavLink
                to={node.to}
                end={node.to === '/'}
                onClick={onNavigate}
                title={node.label}
                className={({ isActive }) =>
                  cn(linhaBase, 'justify-center py-2.5', isActive ? ativo : inativo)
                }
              >
                <Marcador node={node} />
              </NavLink>
            ) : (
              <button
                type="button"
                title={node.label}
                onClick={() => {
                  onExpandSidebar();
                  setAbertos((prev) => new Set([...prev, node.label]));
                }}
                className={cn(
                  linhaBase,
                  'justify-center py-2.5',
                  grupoContémAtivo(node, pathname) ? ativo : inativo,
                )}
              >
                <Marcador node={node} />
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  // ---- Modo expandido: árvore completa ----
  const renderNode = (node: NavNode) => {
    if (!node.children) {
      return (
        <NavLink
          to={node.to!}
          end={node.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => cn(linhaBase, 'py-2', isActive ? ativo : inativo)}
        >
          <Marcador node={node} />
          <span className="flex-1 truncate">{node.label}</span>
        </NavLink>
      );
    }

    const aberto = abertos.has(node.label);
    const contem = grupoContémAtivo(node, pathname);
    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(node.label)}
          aria-expanded={aberto}
          className={cn(linhaBase, 'py-2.5', contem && !aberto ? ativo : inativo)}
        >
          <Marcador node={node} />
          <span className="flex-1 truncate text-left">{node.label}</span>
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 transition-transform', aberto && 'rotate-90')}
          />
        </button>
        {aberto && (
          <div className="ml-[18px] mt-1 space-y-1 pl-2">
            {node.children.map((filho) => (
              <div key={filho.label}>{renderNode(filho)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ul className="space-y-1">
      {navigation.map((node) => (
        <li key={node.label}>{renderNode(node)}</li>
      ))}
    </ul>
  );
}

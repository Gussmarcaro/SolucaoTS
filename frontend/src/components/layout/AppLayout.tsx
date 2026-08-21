import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/cn';

const COLLAPSE_KEY = '@SolucaoTS:sidebar-collapsed';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persiste o estado (recolhido/expandido) entre sessões.
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-ink-50 transition-colors duration-300 dark:bg-ink-950">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      {/*
       * A área de conteúdo acompanha a largura do menu (com animação). Na
       * impressão o menu some, então o recuo tem de sumir junto — senão a
       * folha sai com uma faixa em branco à esquerda.
       */}
      <div
        className={cn(
          'transition-[padding] duration-300 print:!pl-0',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]',
        )}
      >
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} collapsed={collapsed} />
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

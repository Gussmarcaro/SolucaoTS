import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 transition-colors duration-300 dark:bg-ink-950">
      {/* Brilho decorativo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-500/10 to-transparent" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img
            src="/logo-vertical.png"
            alt="Solução TS"
            className="h-28 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-vertical-dark.png"
            alt="Solução TS"
            className="hidden h-28 w-auto object-contain dark:block"
          />
        </div>

        <div className="animate-fade-in rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card dark:border-ink-800/70 dark:bg-ink-900 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">{footer}</div>}
      </div>
    </div>
  );
}

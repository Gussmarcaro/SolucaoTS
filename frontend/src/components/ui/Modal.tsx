import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl';
}

const sizes = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Renderiza no <body> em vez de onde foi declarado. Sem isso, um ancestral
  // posicionado (a Topbar é `sticky z-20`) cria um contexto de empilhamento e
  // prende o `z-50` dentro dele — o modal aparece por baixo da página.
  return createPortal(
    // Rolagem e centralização ficam em elementos separados de propósito.
    // Centralizar (`items-center`) no próprio contêiner que rola faz o excesso
    // vazar para os DOIS lados quando o conteúdo é mais alto que a tela — e o
    // que sobe acima do topo fica inalcançável, porque não existe scroll
    // negativo. Com o `min-h-full` no contêiner de dentro, ele cresce junto com
    // o conteúdo, não sobra espaço para distribuir e nada é cortado.
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-10 my-4 w-full animate-fade-in rounded-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900',
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4 dark:border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-6 py-4 dark:border-ink-800">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-soft',
  secondary:
    'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-100 dark:border-ink-700 dark:hover:bg-ink-700',
  ghost:
    'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-50',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-soft',
  // Ação de criar registro. Verde do mesmo tom do Badge de sucesso.
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      // `type` antes do espalhamento: o padrão é "button", e quem submete diz
      // `type="submit"` — que sobrescreve, porque `{...props}` vem depois.
      //
      // O padrão do HTML para botão sem type é **submit**, e isso morde dentro
      // de formulário: "Adicionar", "Remover" e qualquer ação auxiliar salvavam
      // o formulário em vez de fazer o que dizem. Aqui o padrão seguro é não
      // submeter — enviar é a exceção, e exceção se declara.
      <button
        type="button"
        ref={ref}
        className={cn(
          'focus-ring inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

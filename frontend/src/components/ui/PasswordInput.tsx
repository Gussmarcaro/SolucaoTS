import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LabelCampo, temValor } from './LabelCampo';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const [visivel, setVisivel] = useState(false);
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <LabelCampo texto={label} preenchido={temValor(props.value)} htmlFor={inputId} />
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visivel ? 'text' : 'password'}
            className={cn(
              'focus-ring h-10 w-full rounded-xl border bg-white px-3 pr-10 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:bg-ink-900 dark:text-ink-100',
              error
                ? 'border-red-400 focus-visible:ring-red-500 dark:border-red-500'
                : 'border-ink-200 dark:border-ink-700',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            tabIndex={-1}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
          >
            {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

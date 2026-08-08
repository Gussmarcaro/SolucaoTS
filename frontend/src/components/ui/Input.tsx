import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LabelCampo, temValor } from './LabelCampo';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightSlot, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && <LabelCampo texto={label} preenchido={temValor(props.value)} htmlFor={inputId} />}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'focus-ring h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:bg-ink-900 dark:text-ink-100',
              error
                ? 'border-red-400 focus-visible:ring-red-500 dark:border-red-500'
                : 'border-ink-200 dark:border-ink-700',
              rightSlot && 'pr-10',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">{rightSlot}</div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-ink-400">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

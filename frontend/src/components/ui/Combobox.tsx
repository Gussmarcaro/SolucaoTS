import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LabelCampo, temValor } from './LabelCampo';

export interface OpcaoCombo {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  label?: string;
  value: string; // '' = nenhum
  onChange: (value: string) => void;
  options: OpcaoCombo[];
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Combobox de seleção única, pesquisável (filtra por texto). */
export function Combobox({ label, value, onChange, options, placeholder, error, hint, disabled, name }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selecionada = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtradas = query.trim()
    ? options.filter((o) => norm(o.label).includes(norm(query)) || (o.sub && norm(o.sub).includes(norm(query))))
    : options;

  function escolher(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="w-full" ref={ref}>
      {label && <LabelCampo texto={label} preenchido={temValor(value)} />}
      <div className="relative">
        <input
          name={name}
          value={open ? query : selecionada?.label ?? ''}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={selecionada ? selecionada.label : placeholder ?? 'Selecione...'}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'focus-ring h-10 w-full rounded-xl border bg-white pl-3 pr-16 text-[12px] text-ink-800 placeholder:text-ink-400 transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-ink-900 dark:text-ink-100',
            error ? 'border-red-400 dark:border-red-500' : 'border-ink-200 dark:border-ink-700',
          )}
        />
        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-ink-400">
          {selecionada && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => escolher('')}
              className="pointer-events-auto rounded p-0.5 hover:text-ink-700 dark:hover:text-ink-200"
              title="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="h-4 w-4" />
        </div>

        {open && !disabled && (
          <ul role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {filtradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-400">Nenhum resultado.</li>
            ) : (
              filtradas.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => escolher(o.value)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800',
                      o.value === value ? 'font-medium text-brand-600 dark:text-brand-300' : 'text-ink-700 dark:text-ink-200',
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {o.label}
                      {o.sub && <span className="ml-1 text-xs text-ink-400">{o.sub}</span>}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-red-500">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

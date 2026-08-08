import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Opcao } from '@/lib/dominios';

interface Props {
  label?: string;
  /** Código selecionado ('' = nenhum). */
  value: string;
  onChange: (codigo: string) => void;
  options: Opcao[];
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface PropsMulti {
  label?: string;
  /** Códigos selecionados. */
  value: number[];
  onChange: (codigos: number[]) => void;
  options: Opcao[];
  hint?: string;
  error?: string;
}

/**
 * Seleção múltipla sobre uma tabela de domínio (ex.: `natureza_contratacao`,
 * que aceita vários códigos por contrato). Lista rolável de caixas de seleção
 * — mais direto que um popup para um campo que costuma ter poucas marcações.
 */
export function MultiSelectDominio({ label, value, onChange, options, hint, error }: PropsMulti) {
  const alternar = (codigo: number) =>
    onChange(value.includes(codigo) ? value.filter((v) => v !== codigo) : [...value, codigo].sort((a, b) => a - b));

  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</label>}
      <div
        className={cn(
          'max-h-44 overflow-auto rounded-xl border bg-white p-1 dark:bg-ink-900',
          error ? 'border-red-400 dark:border-red-500' : 'border-ink-200 dark:border-ink-700',
        )}
      >
        {options.map((o) => {
          const marcado = value.includes(Number(o.value));
          return (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800',
                marcado ? 'font-medium text-brand-600 dark:text-brand-300' : 'text-ink-700 dark:text-ink-200',
              )}
            >
              <input
                type="checkbox"
                checked={marcado}
                onChange={() => alternar(Number(o.value))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus-ring dark:border-ink-600"
              />
              <span className="min-w-0">
                <span className="font-mono text-xs text-ink-500 dark:text-ink-400">{o.value}</span>
                <span className="ml-2">{o.label}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : (
        <p className="mt-1 text-xs text-ink-400">{value.length} selecionada(s).</p>
      )}
    </div>
  );
}

/**
 * Select pesquisável sobre uma tabela de domínio fixa da Fase V.
 *
 * Só permite escolher da lista: as tabelas vêm do JSON Schema oficial, então
 * um código fora delas seria rejeitado no envio. Quando o valor gravado não
 * consta na tabela (dado antigo, capturado antes de termos o schema), ele é
 * mantido e sinalizado, para o usuário corrigir em vez de perder o registro.
 *
 * Existe separado do `Combobox` porque este trabalha com código + rótulo e
 * mostra o código na lista — o `Combobox` é genérico, para opções de negócio.
 */
export function SelectDominio({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  disabled,
  name,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selecionada = options.find((o) => o.value === value) ?? null;
  const foraDaTabela = value !== '' && !selecionada;

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setTermo('');
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const filtradas = termo.trim()
    ? options.filter((o) => norm(o.label).includes(norm(termo)) || o.value.startsWith(termo.trim()))
    : options;

  function escolher(codigo: string) {
    onChange(codigo);
    setAberto(false);
    setTermo('');
  }

  const texto = selecionada
    ? `${selecionada.value} — ${selecionada.label}`
    : foraDaTabela
      ? `${value} — código inválido`
      : '';

  return (
    <div className="w-full" ref={ref}>
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</label>}
      <div className="relative">
        <input
          name={name}
          value={aberto ? termo : texto}
          onChange={(e) => {
            setTermo(e.target.value);
            if (!aberto) setAberto(true);
          }}
          onFocus={() => !disabled && setAberto(true)}
          placeholder={placeholder ?? 'Selecione ou digite para filtrar...'}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'focus-ring h-10 w-full rounded-xl border bg-white pl-3 pr-16 text-sm text-ink-800 placeholder:text-ink-400 transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-ink-900 dark:text-ink-100',
            error ? 'border-red-400 dark:border-red-500' : 'border-ink-200 dark:border-ink-700',
          )}
        />
        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-ink-400">
          {value && !disabled && (
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

        {aberto && !disabled && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {filtradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-400">Nenhuma opção encontrada.</li>
            ) : (
              filtradas.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => escolher(o.value)}
                    className={cn(
                      'flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800',
                      o.value === value ? 'font-medium text-brand-600 dark:text-brand-300' : 'text-ink-700 dark:text-ink-200',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-ink-500 dark:text-ink-400">{o.value}</span>
                      <span className="ml-2">{o.label}</span>
                    </span>
                    {o.value === value && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : foraDaTabela ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Código não consta na tabela oficial do TCESP — escolha um da lista, senão o envio será rejeitado.
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

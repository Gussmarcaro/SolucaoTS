import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LabelCampo, temValor } from './LabelCampo';

export interface ItemDominio {
  /** Código oficial — é o que fica gravado no registro. */
  codigo: string;
  /** Descrição exibida na lista. */
  descricao: string;
  /** Informação secundária opcional (ex.: esfera, escrituração). */
  detalhe?: string;
}

interface Props {
  label?: string;
  /** Código selecionado ('' = nenhum). */
  value: string;
  onChange: (codigo: string) => void;
  /** Consulta no servidor; recebe o texto digitado. */
  buscar: (termo: string) => Promise<ItemDominio[]>;
  /** Resolve a descrição de um código já gravado (ao abrir o formulário). */
  resolver?: (codigo: string) => Promise<ItemDominio | null>;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
}

const ATRASO_MS = 250;

/**
 * Autocomplete das tabelas de domínio oficiais (CBO, classificação econômica).
 *
 * Diferente do `Combobox`, não recebe a lista pronta: consulta o servidor a
 * cada digitação, porque as tabelas têm milhares de códigos. O valor guardado
 * é sempre o código oficial — digitar livremente não seleciona nada, o que
 * evita gravar código inexistente (causa de rejeição no envio ao TCESP).
 */
export function BuscaDominio({
  label,
  value,
  onChange,
  buscar,
  resolver,
  placeholder,
  error,
  hint,
  disabled,
  name,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState<ItemDominio[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState<ItemDominio | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Descrição do código já gravado (edição). Só busca quando o código muda
  // para um que não é o que já está exibido.
  useEffect(() => {
    if (!value) {
      setSelecionado(null);
      return;
    }
    if (selecionado?.codigo === value) return;
    let ativo = true;
    if (resolver) {
      void resolver(value).then((item) => {
        if (ativo) setSelecionado(item ?? { codigo: value, descricao: 'Código não encontrado na tabela oficial' });
      });
    } else {
      setSelecionado({ codigo: value, descricao: '' });
    }
    return () => {
      ativo = false;
    };
    // `selecionado` fora das deps de propósito: só reage à mudança do código.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resolver]);

  // Busca no servidor com atraso, para não disparar a cada tecla.
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setCarregando(true);
    const id = setTimeout(() => {
      void buscar(termo)
        .then((resultado) => ativo && setItens(resultado))
        .catch(() => ativo && setItens([]))
        .finally(() => ativo && setCarregando(false));
    }, ATRASO_MS);
    return () => {
      ativo = false;
      clearTimeout(id);
    };
    // `buscar` costuma ser recriada a cada render; depender dela causaria loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, aberto]);

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

  function escolher(item: ItemDominio | null) {
    setSelecionado(item);
    onChange(item?.codigo ?? '');
    setAberto(false);
    setTermo('');
  }

  const textoSelecionado = selecionado ? `${selecionado.codigo} — ${selecionado.descricao}` : '';

  return (
    <div className="w-full" ref={ref}>
      {label && <LabelCampo texto={label} preenchido={temValor(value)} />}
      <div className="relative">
        <input
          name={name}
          value={aberto ? termo : textoSelecionado}
          onChange={(e) => {
            setTermo(e.target.value);
            if (!aberto) setAberto(true);
          }}
          onFocus={() => !disabled && setAberto(true)}
          placeholder={placeholder ?? 'Digite o código ou parte da descrição...'}
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
              onClick={() => escolher(null)}
              className="pointer-events-auto rounded p-0.5 hover:text-ink-700 dark:hover:text-ink-200"
              title="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {carregando && aberto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>

        {aberto && !disabled && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {carregando && itens.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-400">Buscando...</li>
            ) : itens.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-400">
                {termo ? 'Nenhum código encontrado.' : 'Digite para buscar.'}
              </li>
            ) : (
              itens.map((item) => (
                <li key={item.codigo}>
                  <button
                    type="button"
                    onClick={() => escolher(item)}
                    className={cn(
                      'flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800',
                      item.codigo === value
                        ? 'font-medium text-brand-600 dark:text-brand-300'
                        : 'text-ink-700 dark:text-ink-200',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-ink-500 dark:text-ink-400">{item.codigo}</span>
                      <span className="ml-2">{item.descricao}</span>
                      {item.detalhe && <span className="ml-1 text-xs text-ink-400">{item.detalhe}</span>}
                    </span>
                    {item.codigo === value && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

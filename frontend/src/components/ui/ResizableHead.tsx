import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { cn } from '@/lib/cn';

export interface SortState {
  campo: string;
  direcao: 'asc' | 'desc';
}

interface Props {
  colunas: ColunaDef[];
  widths: Record<string, number>;
  startResize: (key: string, e: React.MouseEvent) => void;
  sort?: SortState | null;
  onSort?: (sortKey: string) => void;
}

/**
 * `<colgroup>` + `<thead>` para tabelas com colunas redimensionáveis e ordenáveis.
 * Renderize-o como filho direto de `<table style={{ tableLayout: 'fixed' }}>`.
 */
export function ResizableHead({ colunas, widths, startResize, sort, onSort }: Props) {
  return (
    <>
      <colgroup>
        {colunas.map((c) => (
          <col key={c.key} style={{ width: widths[c.key] ?? c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
          {colunas.map((c, i) => {
            const ordenavel = !!(c.sortKey && onSort);
            const ativa = !!(c.sortKey && sort?.campo === c.sortKey);
            const conteudo = (
              <span
                className={cn(
                  'flex items-center gap-1',
                  c.align === 'right' && 'justify-end',
                  c.align === 'center' && 'justify-center',
                )}
              >
                <span className="truncate">{c.label}</span>
                {ordenavel &&
                  (ativa ? (
                    sort?.direcao === 'asc' ? (
                      <ChevronUp className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover/th:opacity-100 dark:text-ink-600" />
                  ))}
              </span>
            );

            return (
              <th
                key={c.key}
                className={cn(
                  'group/th relative select-none px-4 py-3 font-semibold',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                {ordenavel ? (
                  <button
                    type="button"
                    onClick={() => onSort!(c.sortKey!)}
                    className={cn(
                      'focus-ring flex w-full items-center rounded transition-colors hover:text-ink-800 dark:hover:text-ink-100',
                      ativa && 'text-brand-600 dark:text-brand-300',
                      c.align === 'right' && 'justify-end',
                      c.align === 'center' && 'justify-center',
                    )}
                    title="Ordenar"
                  >
                    {conteudo}
                  </button>
                ) : (
                  conteudo
                )}

                {/* Puxador de redimensionamento (não na última coluna) */}
                {i < colunas.length - 1 && (
                  <span
                    onMouseDown={(e) => startResize(c.key, e)}
                    className="group/rz absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
                    title="Arraste para redimensionar"
                  >
                    <span className="h-1/2 w-px bg-ink-200 transition-all group-hover/rz:h-full group-hover/rz:w-0.5 group-hover/rz:bg-brand-400 dark:bg-ink-700" />
                  </span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    </>
  );
}

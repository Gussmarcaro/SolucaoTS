import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, GripVertical } from 'lucide-react';
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
  /** Habilita arrastar-e-soltar para reordenar as colunas. */
  onReorder?: (fromKey: string, toKey: string) => void;
}

/**
 * `<colgroup>` + `<thead>` para tabelas com colunas redimensionáveis, ordenáveis
 * (clique no título) e reordenáveis (arraste pela alça). Filho direto de
 * `<table style={{ tableLayout: 'fixed' }}>`.
 */
export function ResizableHead({ colunas, widths, startResize, sort, onSort, onReorder }: Props) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);

  return (
    <>
      <colgroup>
        {colunas.map((c) => (
          <col key={c.key} style={{ width: widths[c.key] ?? c.width }} />
        ))}
        {/* Coluna espaçadora: absorve a folga quando a soma das colunas é menor
            que o container, para as colunas reais manterem a largura exata
            (resize/arraste consistente em qualquer grade). */}
        <col key="__spacer__" />
      </colgroup>
      <thead>
        <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
          {colunas.map((c) => {
            const ordenavel = !!(c.sortKey && onSort);
            const movivel = !!onReorder && c.movivel !== false;
            const ativa = !!(c.sortKey && sort?.campo === c.sortKey);

            const rotulo = (
              <span
                className={cn(
                  'flex min-w-0 items-center gap-1',
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
                onDragOver={(e) => {
                  if (arrastando && arrastando !== c.key) {
                    e.preventDefault();
                    setAlvo(c.key);
                  }
                }}
                onDragLeave={() => setAlvo((k) => (k === c.key ? null : k))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (arrastando && onReorder) onReorder(arrastando, c.key);
                  setArrastando(null);
                  setAlvo(null);
                }}
                className={cn(
                  'group/th relative select-none px-4 py-3 font-semibold transition-colors',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                  alvo === c.key && 'bg-brand-50 dark:bg-brand-500/10',
                  arrastando === c.key && 'opacity-50',
                )}
              >
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-1',
                    c.align === 'right' && 'justify-end',
                    c.align === 'center' && 'justify-center',
                  )}
                >
                  {movivel && (
                    <span
                      draggable
                      onDragStart={(e) => {
                        setArrastando(c.key);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
                      title="Arraste para mover a coluna"
                      className="-ml-1 shrink-0 cursor-grab text-ink-300 opacity-0 transition-opacity hover:text-ink-500 active:cursor-grabbing group-hover/th:opacity-100 dark:text-ink-600"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                  )}

                  {ordenavel ? (
                    <button
                      type="button"
                      onClick={() => onSort!(c.sortKey!)}
                      className={cn(
                        'focus-ring flex min-w-0 items-center rounded transition-colors hover:text-ink-800 dark:hover:text-ink-100',
                        ativa && 'text-brand-600 dark:text-brand-300',
                        c.align === 'right' && 'justify-end',
                        c.align === 'center' && 'justify-center',
                      )}
                      title="Ordenar"
                    >
                      {rotulo}
                    </button>
                  ) : (
                    rotulo
                  )}
                </div>

                {/* Puxador de redimensionamento — em todas as colunas reais
                    (a coluna espaçadora final absorve a folga). */}
                <span
                  onMouseDown={(e) => startResize(c.key, e)}
                  className="group/rz absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
                  title="Arraste para redimensionar"
                >
                  <span className="h-1/2 w-px bg-ink-200 transition-all group-hover/rz:h-full group-hover/rz:w-0.5 group-hover/rz:bg-brand-400 dark:bg-ink-700" />
                </span>
              </th>
            );
          })}
          {/* Cabeçalho da coluna espaçadora (sem conteúdo). */}
          <th aria-hidden className="px-0" />
        </tr>
      </thead>
    </>
  );
}

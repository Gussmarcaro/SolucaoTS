import type { ColunaDef } from '@/hooks/useResizableColumns';
import { cn } from '@/lib/cn';

interface Props {
  colunas: ColunaDef[];
  widths: Record<string, number>;
  startResize: (key: string, e: React.MouseEvent) => void;
}

/**
 * `<colgroup>` + `<thead>` para tabelas com colunas redimensionáveis.
 * Renderize-o como filho direto de `<table style={{ tableLayout: 'fixed' }}>`.
 */
export function ResizableHead({ colunas, widths, startResize }: Props) {
  return (
    <>
      <colgroup>
        {colunas.map((c) => (
          <col key={c.key} style={{ width: widths[c.key] ?? c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {colunas.map((c, i) => (
            <th
              key={c.key}
              className={cn(
                'relative select-none px-4 py-3 font-semibold',
                c.align === 'right' && 'text-right',
                c.align === 'center' && 'text-center',
              )}
            >
              <span className="block truncate">{c.label}</span>
              {/* Puxador de redimensionamento (não na última coluna) */}
              {i < colunas.length - 1 && (
                <span
                  onMouseDown={(e) => startResize(c.key, e)}
                  className="group absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
                  title="Arraste para redimensionar"
                >
                  <span className="h-1/2 w-px bg-ink-200 transition-colors group-hover:h-full group-hover:w-0.5 group-hover:bg-brand-400 dark:bg-ink-700" />
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}

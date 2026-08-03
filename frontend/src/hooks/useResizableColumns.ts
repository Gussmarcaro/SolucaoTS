import { useCallback, useEffect, useRef, useState } from 'react';

export interface ColunaDef {
  key: string;
  label: string;
  /** Largura padrão em pixels. */
  width: number;
  /** Largura mínima em pixels (default 60). */
  minWidth?: number;
  /** Alinhamento do conteúdo da coluna. */
  align?: 'left' | 'right' | 'center';
  /** Campo do backend usado na ordenação. Se ausente, a coluna não é ordenável. */
  sortKey?: string;
}

/**
 * Colunas redimensionáveis para tabelas: mantém as larguras (com persistência
 * em localStorage por `storageKey`) e expõe o handler para arrastar a borda.
 * Use com `table-layout: fixed` + um `<colgroup>`.
 */
export function useResizableColumns(storageKey: string, colunas: ColunaDef[]) {
  const padrao = useCallback(
    () => Object.fromEntries(colunas.map((c) => [c.key, c.width])) as Record<string, number>,
    [colunas],
  );

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const salvo = localStorage.getItem(storageKey);
      if (salvo) return { ...padrao(), ...JSON.parse(salvo) };
    } catch {
      /* ignore */
    }
    return padrao();
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [storageKey, widths]);

  const arrasto = useRef<{ key: string; startX: number; startW: number; min: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = arrasto.current;
    if (!d) return;
    const nova = Math.max(d.min, d.startW + (e.clientX - d.startX));
    setWidths((prev) => ({ ...prev, [d.key]: nova }));
  }, []);

  const onMouseUp = useCallback(() => {
    arrasto.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const startResize = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const col = colunas.find((c) => c.key === key);
      arrasto.current = {
        key,
        startX: e.clientX,
        startW: widths[key] ?? col?.width ?? 120,
        min: col?.minWidth ?? 60,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [colunas, widths, onMouseMove, onMouseUp],
  );

  const reset = useCallback(() => setWidths(padrao()), [padrao]);

  const totalWidth = colunas.reduce((soma, c) => soma + (widths[c.key] ?? c.width), 0);

  return { widths, startResize, reset, totalWidth };
}

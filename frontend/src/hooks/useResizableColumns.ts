import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  /** Se `false`, a coluna não pode ser movida (ex.: coluna de ações). */
  movivel?: boolean;
}

interface Estado {
  ordem: string[];
  widths: Record<string, number>;
}

/**
 * Colunas de tabela com **largura redimensionável** e **ordem alterável**,
 * ambas persistidas (por `storageKey` — inclua o id do usuário para preferência
 * por usuário). Use com `table-layout: fixed` + `<colgroup>`.
 */
export function useResizableColumns(storageKey: string, base: ColunaDef[]) {
  const byKey = useMemo(() => Object.fromEntries(base.map((c) => [c.key, c])), [base]);
  const keysBase = useMemo(() => base.map((c) => c.key), [base]);
  const widthsPadrao = useMemo(
    () => Object.fromEntries(base.map((c) => [c.key, c.width])) as Record<string, number>,
    [base],
  );

  const carregar = useCallback((): Estado => {
    const padrao: Estado = { ordem: keysBase, widths: { ...widthsPadrao } };
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return padrao;
      const p = JSON.parse(raw) as Partial<Estado>;
      // Mantém só chaves conhecidas e acrescenta novas colunas ao final (compat.).
      const salvos = Array.isArray(p.ordem) ? p.ordem.filter((k) => byKey[k]) : [];
      const ordem = [...salvos, ...keysBase.filter((k) => !salvos.includes(k))];
      return { ordem, widths: { ...widthsPadrao, ...(p.widths ?? {}) } };
    } catch {
      return padrao;
    }
  }, [storageKey, keysBase, widthsPadrao, byKey]);

  const [estado, setEstado] = useState<Estado>(carregar);

  // Recarrega ao trocar a chave (ex.: outro usuário logou).
  useEffect(() => {
    setEstado(carregar());
  }, [carregar]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(estado));
    } catch {
      /* ignore */
    }
  }, [storageKey, estado]);

  const colunas = useMemo(
    () => estado.ordem.map((k) => byKey[k]).filter(Boolean) as ColunaDef[],
    [estado.ordem, byKey],
  );

  // ---- Redimensionamento ----
  const widthsRef = useRef(estado.widths);
  widthsRef.current = estado.widths;
  const arrasto = useRef<{ key: string; startX: number; startW: number; min: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = arrasto.current;
    if (!d) return;
    const nova = Math.max(d.min, d.startW + (e.clientX - d.startX));
    setEstado((prev) => ({ ...prev, widths: { ...prev.widths, [d.key]: nova } }));
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
      const col = byKey[key];
      arrasto.current = {
        key,
        startX: e.clientX,
        startW: widthsRef.current[key] ?? col?.width ?? 120,
        min: col?.minWidth ?? 60,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [byKey, onMouseMove, onMouseUp],
  );

  // ---- Reordenação ----
  const reordenar = useCallback((fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setEstado((prev) => {
      const ordem = [...prev.ordem];
      const from = ordem.indexOf(fromKey);
      const to = ordem.indexOf(toKey);
      if (from < 0 || to < 0) return prev;
      ordem.splice(from, 1);
      ordem.splice(to, 0, fromKey);
      return { ...prev, ordem };
    });
  }, []);

  const reset = useCallback(
    () => setEstado({ ordem: keysBase, widths: { ...widthsPadrao } }),
    [keysBase, widthsPadrao],
  );

  const totalWidth = colunas.reduce((s, c) => s + (estado.widths[c.key] ?? c.width), 0);

  return { colunas, widths: estado.widths, startResize, reordenar, reset, totalWidth };
}

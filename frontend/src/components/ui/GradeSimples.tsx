import { useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ResizableHead, type SortState } from './ResizableHead';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/cn';

interface Props<T> {
  /** Chave do localStorage — o id do usuário é acrescentado aqui dentro. */
  storageKey: string;
  colunas: ColunaDef[];
  dados: T[];
  chave: (item: T) => string;
  renderCell: (coluna: string, item: T) => ReactNode;
  /**
   * Valor que a coluna usa para ordenar, por `sortKey`. Sem isso a grade só
   * redimensiona e reordena colunas.
   */
  valorOrdenacao?: (campo: string, item: T) => string | number | null | undefined;
  carregando?: boolean;
  erro?: string | null;
  vazio?: string;
  onDuploClique?: (item: T) => void;
}

/**
 * Grade no padrão do cadastro de Usuários — colunas redimensionáveis,
 * reordenáveis por arraste e ordenáveis pelo título, com o layout guardado por
 * usuário — para listas **já carregadas por inteiro**.
 *
 * A diferença para as grades dos cadastros é onde a ordenação acontece: lá o
 * back-end ordena e pagina; aqui a lista inteira já está em memória (são poucos
 * registros por entidade), então ordenar no cliente evita uma ida ao servidor a
 * cada clique no cabeçalho.
 */
export function GradeSimples<T>({
  storageKey,
  colunas,
  dados,
  chave,
  renderCell,
  valorOrdenacao,
  carregando,
  erro,
  vazio = 'Nenhum registro.',
  onDuploClique,
}: Props<T>) {
  const { usuario } = useAuth();
  const [sort, setSort] = useState<SortState | null>(null);
  const { colunas: ordenadas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `${storageKey}:${usuario?.id ?? 'anon'}`,
    colunas,
  );

  const linhas = useMemo(() => {
    if (!sort || !valorOrdenacao) return dados;
    const fator = sort.direcao === 'asc' ? 1 : -1;
    return [...dados].sort((a, b) => {
      const va = valorOrdenacao(sort.campo, a);
      const vb = valorOrdenacao(sort.campo, b);
      // Vazios sempre no fim, independentemente da direção — no meio da lista
      // eles atrapalhariam a leitura.
      if (va == null || va === '') return vb == null || vb === '' ? 0 : 1;
      if (vb == null || vb === '') return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator;
      return String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' }) * fator;
    });
  }, [dados, sort, valorOrdenacao]);

  const handleSort = (sortKey: string) =>
    setSort((prev) =>
      prev?.campo === sortKey
        ? { campo: sortKey, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo: sortKey, direcao: 'asc' },
    );

  const colunasComEspacador = ordenadas.length + 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
      <table className="w-full text-left text-[13px]" style={{ tableLayout: 'fixed', minWidth: totalWidth }}>
        <ResizableHead
          colunas={ordenadas}
          widths={widths}
          startResize={startResize}
          sort={sort}
          onSort={valorOrdenacao ? handleSort : undefined}
          onReorder={reordenar}
        />
        <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
          {carregando ? (
            <tr>
              <td colSpan={colunasComEspacador} className="py-10 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
              </td>
            </tr>
          ) : erro ? (
            <tr>
              <td colSpan={colunasComEspacador} className="py-10 text-center text-sm text-red-500">
                {erro}
              </td>
            </tr>
          ) : linhas.length === 0 ? (
            <tr>
              <td colSpan={colunasComEspacador} className="py-10 text-center text-sm text-ink-400">
                {vazio}
              </td>
            </tr>
          ) : (
            linhas.map((item) => (
              <tr
                key={chave(item)}
                onDoubleClick={onDuploClique ? () => onDuploClique(item) : undefined}
                title={onDuploClique ? 'Duplo-clique para editar' : undefined}
                className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
              >
                {ordenadas.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-2',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                    )}
                  >
                    {renderCell(c.key, item)}
                  </td>
                ))}
                <td aria-hidden className="px-0" />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Power,
  Search,
  ServerCrash,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ResizableHead, type SortState } from '@/components/ui/ResizableHead';
import { useDebounce } from '@/hooks/useDebounce';
import { SeletorPagina } from '@/components/ui/SeletorPagina';
import { PAGE_SIZE_PADRAO, usePageSize } from '@/lib/paginacao';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { useAuth } from '@/contexts/AuthContext';
import { listarBensCedidos } from '@/services/bensCedidos.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { cn } from '@/lib/cn';
import type { BemCedido, FiltrosBemCedido, Paginado } from '@/types/bemCedido';

const vazio: Paginado<BemCedido> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE_PADRAO, totalPages: 1 };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 120, minWidth: 100, align: 'center' },
  { key: 'status', label: 'Status', width: 120, sortKey: 'ativo' },
  { key: 'bem', label: 'Bem', width: 320, sortKey: 'descricao' },
  { key: 'identificador', label: 'Identificador', width: 170, sortKey: 'identificador' },
  { key: 'cessao', label: 'Cessão', width: 130, sortKey: 'dataCessao' },
  { key: 'valor', label: 'Valor', width: 160, sortKey: 'valor', align: 'right' },
];

interface Props {
  refreshKey: number;
  onVisualizar: (bem: BemCedido) => void;
  onEditar: (bem: BemCedido) => void;
  onAlternarStatus: (bem: BemCedido) => void;
}

type StatusFiltro = '' | 'ativos' | 'inativos';

export function BensCedidosList({ refreshKey, onVisualizar, onEditar, onAlternarStatus }: Props) {
  const { usuario: logado } = useAuth();
  const [pageSize, setPageSize] = usePageSize('bens-cedidos');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [resultado, setResultado] = useState<Paginado<BemCedido>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { colunas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `@SolucaoTS:grid:bens-cedidos:v1:${logado?.id ?? 'anon'}`,
    COLUNAS,
  );
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo<FiltrosBemCedido>(() => {
    const f: FiltrosBemCedido = {};
    if (status === 'ativos') f.ativo = true;
    if (status === 'inativos') f.ativo = false;
    return f;
  }, [status]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarBensCedidos({
      filtros,
      busca: buscaDebounced,
      orderBy: sort?.campo,
      orderDir: sort?.direcao,
      page,
      pageSize,
    })
      .then((r) => ativo && setResultado(r))
      .catch((e) => {
        if (!ativo) return;
        setErro(extrairMensagemErro(e, 'Não foi possível carregar os bens.'));
        setResultado(vazio);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [filtros, buscaDebounced, sort, page, pageSize, refreshKey]);

  useEffect(() => setPage(1), [filtros, buscaDebounced, sort, pageSize]);

  function handleSort(sortKey: string) {
    setSort((prev) =>
      prev?.campo === sortKey
        ? { campo: sortKey, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo: sortKey, direcao: 'asc' },
    );
  }

  function renderCell(key: string, b: BemCedido): ReactNode {
    switch (key) {
      case 'acoes':
        return (
          <AcoesGrade recurso="CADASTRO_BENS_CEDIDOS">
            <IconBtn title="Visualizar" onClick={() => onVisualizar(b)}>
              <Eye className="h-4 w-4" />
            </IconBtn>
            <IconBtn exige="EDICAO" title="Editar" onClick={() => onEditar(b)}>
              <Pencil className="h-4 w-4" />
            </IconBtn>
            <IconBtn exige="EDICAO" title={b.ativo ? 'Inativar' : 'Reativar'} danger={b.ativo} onClick={() => onAlternarStatus(b)}>
              <Power className="h-4 w-4" />
            </IconBtn>
          </AcoesGrade>
        );
      case 'status':
        return <Badge tone={b.ativo ? 'success' : 'neutral'}>{b.ativo ? 'Ativo' : 'Inativo'}</Badge>;
      case 'bem':
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800 dark:text-ink-100" title={b.descricao}>{b.descricao}</p>
            <p className="truncate text-xs text-ink-400">{b.tipo}</p>
          </div>
        );
      case 'identificador':
        return <span className="block truncate font-mono text-xs text-ink-600 dark:text-ink-300">{b.identificador}</span>;
      case 'cessao':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(b.dataCessao)}</span>;
      case 'valor':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{formatarMoeda(b.valor)}</span>;
      default:
        return null;
    }
  }

  const { data, total, totalPages } = resultado;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição, tipo, identificador..."
            className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-[12px] text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFiltro)}
            options={[
              { value: 'ativos', label: 'Ativos' },
              { value: 'inativos', label: 'Inativos' },
            ]}
            placeholder="Status (todos)"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]" style={{ tableLayout: 'fixed', minWidth: totalWidth }}>
          <ResizableHead colunas={colunas} widths={widths} startResize={startResize} sort={sort} onSort={handleSort} onReorder={reordenar} />
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <ServerCrash className="mx-auto h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">{erro}</p>
                  <p className="mt-1 text-xs text-ink-400">Verifique se a API do backend está em execução.</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <p className="text-sm text-ink-500 dark:text-ink-400">Nenhum bem encontrado.</p>
                </td>
              </tr>
            ) : (
              data.map((b) => (
                <tr
                  key={b.id}
                  onDoubleClick={() => onEditar(b)}
                  title="Duplo-clique para editar"
                  className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  {colunas.map((col) => (
                    <td key={col.key} className={cn('px-4 py-2', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                      {renderCell(col.key, b)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `${total} bem(ns)` : 'Sem registros'}</span>
        <SeletorPagina valor={pageSize} onChange={setPageSize} total={total} />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || carregando} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="px-1 text-ink-500 dark:text-ink-400">Página {page} de {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages || carregando} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

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
import { listarContratos } from '@/services/contratos.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import { cn } from '@/lib/cn';
import type { Contrato, FiltrosContrato, Paginado } from '@/types/contrato';

const vazio: Paginado<Contrato> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE_PADRAO, totalPages: 1 };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 120, minWidth: 100, align: 'center' },
  { key: 'status', label: 'Status', width: 120, sortKey: 'ativo' },
  { key: 'contrato', label: 'Contrato', width: 300, sortKey: 'numero' },
  { key: 'credorDocumento', label: 'CPF / CNPJ', width: 170, sortKey: 'credorNome' },
  { key: 'natureza', label: 'Natureza', width: 160, sortKey: 'naturezaContratacao' },
  { key: 'assinatura', label: 'Assinatura', width: 130, sortKey: 'dataAssinatura' },
  { key: 'valor', label: 'Valor', width: 160, sortKey: 'valorMontante', align: 'right' },
];

interface Props {
  refreshKey: number;
  onVisualizar: (contrato: Contrato) => void;
  onEditar: (contrato: Contrato) => void;
  onAlternarStatus: (contrato: Contrato) => void;
}

type StatusFiltro = '' | 'ativos' | 'inativos';

export function ContratosList({ refreshKey, onVisualizar, onEditar, onAlternarStatus }: Props) {
  const { usuario: logado } = useAuth();
  const [pageSize, setPageSize] = usePageSize('contratos');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [resultado, setResultado] = useState<Paginado<Contrato>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { colunas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `@SolucaoTS:grid:contratos:v1:${logado?.id ?? 'anon'}`,
    COLUNAS,
  );
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo<FiltrosContrato>(() => {
    const f: FiltrosContrato = {};
    if (status === 'ativos') f.ativo = true;
    if (status === 'inativos') f.ativo = false;
    return f;
  }, [status]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarContratos({
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
        setErro(extrairMensagemErro(e, 'Não foi possível carregar os contratos.'));
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

  function renderCell(key: string, c: Contrato): ReactNode {
    switch (key) {
      case 'acoes':
        return (
          <div className="flex items-center justify-center gap-1">
            <IconBtn title="Visualizar" onClick={() => onVisualizar(c)}>
              <Eye className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Editar" onClick={() => onEditar(c)}>
              <Pencil className="h-4 w-4" />
            </IconBtn>
            <IconBtn title={c.ativo ? 'Inativar' : 'Reativar'} danger={c.ativo} onClick={() => onAlternarStatus(c)}>
              <Power className="h-4 w-4" />
            </IconBtn>
          </div>
        );
      case 'status':
        return <Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>;
      case 'contrato':
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800 dark:text-ink-100" title={c.numero}>Nº {c.numero}</p>
            <p className="truncate text-xs text-ink-400" title={c.credorNome}>{c.credorNome}</p>
          </div>
        );
      case 'credorDocumento':
        return <span className="block truncate font-mono text-xs text-ink-600 dark:text-ink-300">{mascaraCpfCnpj(c.credorDocumento)}</span>;
      case 'natureza':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{c.naturezaContratacao}</span>;
      case 'assinatura':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(c.dataAssinatura)}</span>;
      case 'valor':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{formatarMoeda(c.valorMontante)}</span>;
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
            placeholder="Buscar por número, credor, objeto..."
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
                  <p className="text-sm text-ink-500 dark:text-ink-400">Nenhum contrato encontrado.</p>
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr
                  key={c.id}
                  onDoubleClick={() => onEditar(c)}
                  title="Duplo-clique para editar"
                  className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  {colunas.map((col) => (
                    <td key={col.key} className={cn('px-4 py-2', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                      {renderCell(col.key, c)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `${total} contrato(s)` : 'Sem registros'}</span>
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

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`focus-ring rounded-lg p-1.5 transition-colors ${
        danger
          ? 'text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
          : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200'
      }`}
    >
      {children}
    </button>
  );
}

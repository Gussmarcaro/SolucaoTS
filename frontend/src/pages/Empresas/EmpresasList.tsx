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
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ResizableHead, type SortState } from '@/components/ui/ResizableHead';
import { useDebounce } from '@/hooks/useDebounce';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { useAuth } from '@/contexts/AuthContext';
import { listarEmpresas } from '@/services/empresas.service';
import { extrairMensagemErro } from '@/services/http';
import { mascaraCpfCnpj } from '@/lib/masks';
import { cn } from '@/lib/cn';
import type { Empresa, FiltrosEmpresa, Paginado } from '@/types/empresa';

const PAGE_SIZE = 10;
const vazio: Paginado<Empresa> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 120, minWidth: 100, align: 'center' },
  { key: 'status', label: 'Status', width: 120, sortKey: 'ativo' },
  { key: 'empresa', label: 'Empresa', width: 300, sortKey: 'razaoSocial' },
  { key: 'cnpj', label: 'CNPJ', width: 170, sortKey: 'cnpj' },
  { key: 'cidadeuf', label: 'Cidade / UF', width: 170, sortKey: 'cidade' },
];

interface Props {
  refreshKey: number;
  onVisualizar: (empresa: Empresa) => void;
  onEditar: (empresa: Empresa) => void;
  onAlternarStatus: (empresa: Empresa) => void;
}

type StatusFiltro = '' | 'ativos' | 'inativos';

export function EmpresasList({ refreshKey, onVisualizar, onEditar, onAlternarStatus }: Props) {
  const { usuario: logado } = useAuth();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [resultado, setResultado] = useState<Paginado<Empresa>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { colunas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `@SolucaoTS:grid:empresas:v2:${logado?.id ?? 'anon'}`,
    COLUNAS,
  );
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo<FiltrosEmpresa>(() => {
    const f: FiltrosEmpresa = {};
    if (status === 'ativos') f.ativo = true;
    if (status === 'inativos') f.ativo = false;
    return f;
  }, [status]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarEmpresas({
      filtros,
      busca: buscaDebounced,
      orderBy: sort?.campo,
      orderDir: sort?.direcao,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((r) => ativo && setResultado(r))
      .catch((e) => {
        if (!ativo) return;
        setErro(extrairMensagemErro(e, 'Não foi possível carregar as empresas.'));
        setResultado(vazio);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [filtros, buscaDebounced, sort, page, refreshKey]);

  useEffect(() => setPage(1), [filtros, buscaDebounced, sort]);

  function handleSort(sortKey: string) {
    setSort((prev) =>
      prev?.campo === sortKey
        ? { campo: sortKey, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo: sortKey, direcao: 'asc' },
    );
  }

  function renderCell(key: string, emp: Empresa): ReactNode {
    switch (key) {
      case 'acoes':
        return (
          <div className="flex items-center justify-center gap-1">
            <IconBtn title="Visualizar" onClick={() => onVisualizar(emp)}>
              <Eye className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Editar" onClick={() => onEditar(emp)}>
              <Pencil className="h-4 w-4" />
            </IconBtn>
            <IconBtn title={emp.ativo ? 'Inativar' : 'Reativar'} danger={emp.ativo} onClick={() => onAlternarStatus(emp)}>
              <Power className="h-4 w-4" />
            </IconBtn>
          </div>
        );
      case 'empresa': {
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800 dark:text-ink-100" title={emp.razaoSocial}>
              {emp.razaoSocial}
            </p>
            {emp.nomeFantasia && <p className="truncate text-xs text-ink-400">{emp.nomeFantasia}</p>}
          </div>
        );
      }
      case 'cnpj':
        return <span className="block truncate font-mono text-xs text-ink-600 dark:text-ink-300">{mascaraCpfCnpj(emp.cnpj)}</span>;
      case 'cidadeuf':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{emp.cidade} / {emp.uf}</span>;
      case 'status':
        return <Badge tone={emp.ativo ? 'success' : 'neutral'}>{emp.ativo ? 'Ativo' : 'Inativo'}</Badge>;
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
            placeholder="Buscar por razão social, fantasia, CNPJ, cidade..."
            className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
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
        <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed', minWidth: totalWidth }}>
          <ResizableHead
            colunas={colunas}
            widths={widths}
            startResize={startResize}
            sort={sort}
            onSort={handleSort}
            onReorder={reordenar}
          />
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
                  <Building2 className="mx-auto h-8 w-8 text-ink-300" />
                  <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Nenhuma empresa encontrada.</p>
                </td>
              </tr>
            ) : (
              data.map((emp) => (
                <tr
                  key={emp.id}
                  onDoubleClick={() => onEditar(emp)}
                  title="Duplo-clique para editar"
                  className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  {colunas.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                      )}
                    >
                      {renderCell(c.key, emp)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `${total} empresa(s)` : 'Sem registros'}</span>
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

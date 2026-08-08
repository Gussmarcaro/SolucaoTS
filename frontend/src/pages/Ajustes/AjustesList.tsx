import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Search,
  ServerCrash,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ResizableHead, type SortState } from '@/components/ui/ResizableHead';
import { useDebounce } from '@/hooks/useDebounce';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { useAuth } from '@/contexts/AuthContext';
import { listarAjustes } from '@/services/ajustes.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { cn } from '@/lib/cn';
import {
  STATUS_AJUSTE_LABEL,
  TIPO_AJUSTE_LABEL,
  type Ajuste,
  type FiltrosAjuste,
  type Paginado,
} from '@/types/ajuste';

const PAGE_SIZE = 10;
const vazio: Paginado<Ajuste> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 110, minWidth: 90, align: 'center' },
  { key: 'status', label: 'Situação', width: 140, sortKey: 'status' },
  { key: 'ajuste', label: 'Ajuste', width: 300, sortKey: 'codigoAjuste' },
  { key: 'entidade', label: 'Entidade', width: 260 },
  { key: 'assinatura', label: 'Assinatura', width: 130, sortKey: 'dataAssinatura' },
  { key: 'valor', label: 'Valor Global', width: 170, sortKey: 'valorGlobal', align: 'right' },
];

interface Props {
  refreshKey: number;
  onVisualizar: (ajuste: Ajuste) => void;
  onEditar: (ajuste: Ajuste) => void;
}

type StatusFiltro = '' | 'EM_ELABORACAO' | 'ENVIADO';

export function AjustesList({ refreshKey, onVisualizar, onEditar }: Props) {
  const navigate = useNavigate();
  const { usuario: logado } = useAuth();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [resultado, setResultado] = useState<Paginado<Ajuste>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { colunas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `@SolucaoTS:grid:ajustes:v1:${logado?.id ?? 'anon'}`,
    COLUNAS,
  );
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo<FiltrosAjuste>(() => {
    const f: FiltrosAjuste = {};
    if (status) f.status = status;
    return f;
  }, [status]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarAjustes({
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
        setErro(extrairMensagemErro(e, 'Não foi possível carregar os ajustes.'));
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

  function renderCell(key: string, a: Ajuste): ReactNode {
    switch (key) {
      case 'acoes':
        return (
          <div className="flex items-center justify-center gap-1">
            <IconBtn title="Abrir (abas)" onClick={() => navigate(`/cadastro/ajustes/${a.id}`)}>
              <FolderOpen className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Visualizar" onClick={() => onVisualizar(a)}>
              <Eye className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Editar" onClick={() => onEditar(a)}>
              <Pencil className="h-4 w-4" />
            </IconBtn>
          </div>
        );
      case 'status':
        return (
          <Badge tone={a.status === 'ENVIADO' ? 'success' : 'warning'}>
            {STATUS_AJUSTE_LABEL[a.status]}
          </Badge>
        );
      case 'ajuste':
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink-700 dark:text-ink-200" title={a.codigoAjuste}>{a.codigoAjuste}</p>
            <p className="truncate text-xs text-ink-400">{TIPO_AJUSTE_LABEL[a.tipoAjuste]}</p>
          </div>
        );
      case 'entidade':
        return <span className="block truncate text-ink-700 dark:text-ink-200" title={a.entidadeNome}>{a.entidadeNome}</span>;
      case 'assinatura':
        return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(a.dataAssinatura)}</span>;
      case 'valor':
        return <span className="block truncate text-ink-700 dark:text-ink-200">{formatarMoeda(a.valorGlobal)}</span>;
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
            placeholder="Buscar por código, entidade, objeto..."
            className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFiltro)}
            options={[
              { value: 'EM_ELABORACAO', label: 'Em elaboração' },
              { value: 'ENVIADO', label: 'Enviado' },
            ]}
            placeholder="Situação (todas)"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed', minWidth: totalWidth }}>
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
                  <FileText className="mx-auto h-8 w-8 text-ink-300" />
                  <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Nenhum ajuste encontrado.</p>
                </td>
              </tr>
            ) : (
              data.map((a) => (
                <tr
                  key={a.id}
                  onDoubleClick={() => navigate(`/cadastro/ajustes/${a.id}`)}
                  title="Duplo-clique para abrir"
                  className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  {colunas.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                      {renderCell(col.key, a)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `${total} ajuste(s)` : 'Sem registros'}</span>
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
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
    >
      {children}
    </button>
  );
}

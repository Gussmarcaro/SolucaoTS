import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Play,
  Search,
  ServerCrash,
  Trash2,
} from 'lucide-react';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ResizableHead, type SortState } from '@/components/ui/ResizableHead';
import { SeletorPagina } from '@/components/ui/SeletorPagina';
import { PAGE_SIZE_PADRAO, usePageSize } from '@/lib/paginacao';
import { useDebounce } from '@/hooks/useDebounce';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { useAuth } from '@/contexts/AuthContext';
import { listarTarefas } from '@/services/tarefas.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr } from '@/lib/masks';
import { cn } from '@/lib/cn';
import {
  PRIORIDADE_LABEL,
  PRIORIDADE_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  rotuloPrazo,
  situacaoPrazo,
  type FiltrosTarefa,
  type Paginado,
  type StatusTarefa,
  type Tarefa,
} from '@/types/tarefa';

const vazio: Paginado<Tarefa> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE_PADRAO, totalPages: 1 };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 140, minWidth: 120, align: 'center' },
  { key: 'prazo', label: 'Prazo', width: 150, sortKey: 'prazoLegal' },
  { key: 'tarefa', label: 'Tarefa', width: 340, sortKey: 'titulo' },
  { key: 'ajuste', label: 'Ajuste', width: 220 },
  { key: 'responsavel', label: 'Responsável', width: 180 },
  { key: 'prioridade', label: 'Prioridade', width: 130, sortKey: 'prioridade' },
  { key: 'status', label: 'Situação', width: 140, sortKey: 'status' },
];

/** Cor do prazo. Atrasada em vermelho é a informação que a tela existe para dar. */
const COR_PRAZO: Record<string, string> = {
  ATRASADA: 'text-red-600 dark:text-red-400 font-semibold',
  HOJE: 'text-amber-600 dark:text-amber-400 font-semibold',
  PROXIMA: 'text-amber-600 dark:text-amber-400',
  EM_DIA: 'text-ink-600 dark:text-ink-300',
  ENCERRADA: 'text-ink-400 line-through',
};

export type Recorte = 'abertas' | 'atrasadas' | 'minhas' | 'todas';

interface Props {
  refreshKey: number;
  recorte: Recorte;
  onRecorte: (r: Recorte) => void;
  onEditar: (t: Tarefa) => void;
  onExcluir: (t: Tarefa) => void;
  onStatus: (t: Tarefa, status: StatusTarefa) => void;
}

export function TarefasList({ refreshKey, recorte, onRecorte, onEditar, onExcluir, onStatus }: Props) {
  const { usuario: logado } = useAuth();
  const [pageSize, setPageSize] = usePageSize('tarefas');
  const [busca, setBusca] = useState('');
  const [prioridade, setPrioridade] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const [resultado, setResultado] = useState<Paginado<Tarefa>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { colunas, widths, startResize, reordenar, totalWidth } = useResizableColumns(
    `@SolucaoTS:grid:tarefas:v1:${logado?.id ?? 'anon'}`,
    COLUNAS,
  );
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo<FiltrosTarefa>(() => {
    const f: FiltrosTarefa = {};
    if (recorte === 'abertas') f.abertas = true;
    if (recorte === 'atrasadas') f.atrasadas = true;
    if (recorte === 'minhas') {
      f.responsavelId = 'eu';
      f.abertas = true;
    }
    if (prioridade) f.prioridade = prioridade as FiltrosTarefa['prioridade'];
    return f;
  }, [recorte, prioridade]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarTarefas({
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
        setErro(extrairMensagemErro(e, 'Não foi possível carregar as tarefas.'));
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

  function renderCell(key: string, t: Tarefa): ReactNode {
    const aberta = t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO';
    switch (key) {
      case 'acoes':
        return (
          <AcoesGrade recurso="FISCALIZACAO">
            {/* Concluir é o caminho comum do módulo: fica a um clique, não
                escondido dentro do formulário. */}
            {aberta && (
              <IconBtn exige="EDICAO" title="Concluir" onClick={() => onStatus(t, 'CONCLUIDA')}>
                <Check className="h-4 w-4" />
              </IconBtn>
            )}
            {t.status === 'PENDENTE' && (
              <IconBtn exige="EDICAO" title="Iniciar" onClick={() => onStatus(t, 'EM_ANDAMENTO')}>
                <Play className="h-4 w-4" />
              </IconBtn>
            )}
            <IconBtn exige="EDICAO" title="Editar" onClick={() => onEditar(t)}>
              <Pencil className="h-4 w-4" />
            </IconBtn>
            <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => onExcluir(t)}>
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </AcoesGrade>
        );
      case 'prazo':
        return (
          <div className="min-w-0">
            <p className={cn('truncate text-xs', COR_PRAZO[situacaoPrazo(t)])}>{rotuloPrazo(t)}</p>
            <p className="truncate text-[11px] text-ink-400">{dataBr(t.prazoLegal)}</p>
          </div>
        );
      case 'tarefa':
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink-800 dark:text-ink-100" title={t.titulo}>
              {/* Sino: a tarefa nasceu de um prazo legal, não de uma anotação
                  qualquer — quem lê a grade precisa distinguir as duas. */}
              {t.origemAlerta && <Bell className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
              <span className="truncate">{t.titulo}</span>
            </p>
            {t.descricao && (
              <p className="truncate text-xs text-ink-400" title={t.descricao}>{t.descricao}</p>
            )}
          </div>
        );
      case 'ajuste':
        return t.ajusteId ? (
          <Link
            to={`/cadastro/ajustes/${t.ajusteId}`}
            className="block min-w-0 text-brand-600 hover:underline dark:text-brand-300"
          >
            <span className="block truncate font-mono text-xs">{t.ajusteCodigo}</span>
            <span className="block truncate text-[11px] text-ink-400">{t.entidadeNome}</span>
          </Link>
        ) : (
          <span className="text-xs text-ink-400">—</span>
        );
      case 'responsavel':
        return (
          <span className="block truncate text-ink-600 dark:text-ink-300">
            {t.responsavelNome ?? <span className="text-ink-400">Sem responsável</span>}
          </span>
        );
      case 'prioridade':
        return <Badge tone={PRIORIDADE_TONE[t.prioridade]}>{PRIORIDADE_LABEL[t.prioridade]}</Badge>;
      case 'status':
        return <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>;
      default:
        return null;
    }
  }

  const { data, total, totalPages } = resultado;

  const RECORTES: { id: Recorte; label: string }[] = [
    { id: 'abertas', label: 'Em aberto' },
    { id: 'atrasadas', label: 'Atrasadas' },
    { id: 'minhas', label: 'Minhas' },
    { id: 'todas', label: 'Todas' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, ajuste, OSC, responsável..."
              className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-[12px] text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Recortes em vez de um combo de status: a pergunta do dia a dia é
              "o que está atrasado" e "o que é meu", não "quais estão PENDENTE". */}
          <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-800">
            {RECORTES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRecorte(r.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  recorte === r.id
                    ? 'bg-brand-500 text-white'
                    : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-40">
            <Select
              name="prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              options={Object.entries(PRIORIDADE_LABEL).map(([value, label]) => ({ value, label }))}
              placeholder="Prioridade (todas)"
            />
          </div>
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
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    {recorte === 'atrasadas'
                      ? 'Nenhuma tarefa atrasada.'
                      : 'Nenhuma tarefa neste recorte.'}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Os prazos do sino viram tarefa pelo botão “Gerar tarefa”.
                  </p>
                </td>
              </tr>
            ) : (
              data.map((t) => (
                <tr
                  key={t.id}
                  onDoubleClick={() => onEditar(t)}
                  title="Duplo-clique para editar"
                  className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                >
                  {colunas.map((col) => (
                    <td key={col.key} className={cn('px-4 py-2', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                      {renderCell(col.key, t)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `${total} tarefa(s)` : 'Sem registros'}</span>
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

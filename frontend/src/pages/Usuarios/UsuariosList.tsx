import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Loader2, Pencil, Search, ServerCrash } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ResizableHead, type SortState } from '@/components/ui/ResizableHead';
import { useDebounce } from '@/hooks/useDebounce';
import { useResizableColumns, type ColunaDef } from '@/hooks/useResizableColumns';
import { listarUsuarios } from '@/services/usuarios.service';
import { extrairMensagemErro } from '@/services/http';
import { mascaraCelular, mascaraCep, mascaraCpfCnpj } from '@/lib/masks';
import type { Paginado, Usuario } from '@/types/usuario';

const PAGE_SIZE = 10;

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 80, minWidth: 64, align: 'center' },
  { key: 'nome', label: 'Nome / Razão Social', width: 210, sortKey: 'nome' },
  { key: 'documento', label: 'CPF / CNPJ', width: 140, sortKey: 'documento' },
  { key: 'email', label: 'E-mail', width: 220, sortKey: 'email' },
  { key: 'celular', label: 'Celular', width: 140, sortKey: 'celular' },
  { key: 'endereco', label: 'Endereço', width: 190, sortKey: 'logradouro' },
  { key: 'bairro', label: 'Bairro', width: 160, sortKey: 'bairro' },
  { key: 'cidade', label: 'Cidade', width: 150, sortKey: 'cidade' },
  { key: 'cep', label: 'CEP', width: 110, sortKey: 'cep' },
  { key: 'uf', label: 'UF', width: 70, minWidth: 50, sortKey: 'uf' },
];

const vazio: Paginado<Usuario> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

export function UsuariosList({
  refreshKey,
  onEditar,
}: {
  refreshKey: number;
  onEditar: (usuario: Usuario) => void;
}) {
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Usuario>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [sort, setSort] = useState<SortState | null>(null);

  const { widths, startResize, totalWidth } = useResizableColumns('@SolucaoTS:grid:usuarios', COLUNAS);
  const buscaDebounced = useDebounce(busca, 400);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarUsuarios({
      busca: buscaDebounced,
      orderBy: sort?.campo,
      orderDir: sort?.direcao,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((r) => ativo && setResultado(r))
      .catch((e) => {
        if (!ativo) return;
        setErro(extrairMensagemErro(e, 'Não foi possível carregar os usuários.'));
        setResultado(vazio);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [buscaDebounced, sort, page, refreshKey]);

  useEffect(() => setPage(1), [buscaDebounced, sort]);

  function handleSort(sortKey: string) {
    setSort((prev) =>
      prev?.campo === sortKey
        ? { campo: sortKey, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo: sortKey, direcao: 'asc' },
    );
  }

  const { data, total, totalPages } = resultado;
  const inicio = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const fim = Math.min(page * PAGE_SIZE, total);
  const cel = 'truncate px-4 py-3';

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      {/* Busca única — pesquisa em qualquer campo (ignora acentos/caixa) */}
      <div className="border-b border-ink-100 p-4 dark:border-ink-800">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF/CNPJ, e-mail, cidade..."
            className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed', minWidth: totalWidth }}>
          <ResizableHead colunas={COLUNAS} widths={widths} startResize={startResize} sort={sort} onSort={handleSort} />
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={COLUNAS.length} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                  <p className="mt-2 text-sm text-ink-400">Carregando...</p>
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={COLUNAS.length} className="py-16 text-center">
                  <ServerCrash className="mx-auto h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">{erro}</p>
                  <p className="mt-1 text-xs text-ink-400">Verifique se a API do backend está em execução.</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={COLUNAS.length} className="py-16 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-ink-300" />
                  <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Nenhum usuário encontrado.</p>
                </td>
              </tr>
            ) : (
              data.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <button
                        title="Editar"
                        onClick={() => onEditar(u)}
                        className="focus-ring rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800 dark:hover:text-brand-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className={`${cel} font-medium text-ink-800 dark:text-ink-100`} title={u.nome}>{u.nome}</td>
                  <td className={`${cel} font-mono text-xs text-ink-600 dark:text-ink-300`}>{mascaraCpfCnpj(u.documento)}</td>
                  <td className={`${cel} text-ink-600 dark:text-ink-300`} title={u.email}>{u.email}</td>
                  <td className={`${cel} text-ink-600 dark:text-ink-300`}>{mascaraCelular(u.celular)}</td>
                  <td className={`${cel} text-ink-600 dark:text-ink-300`} title={[u.logradouro, u.numero].filter(Boolean).join(', ')}>
                    {[u.logradouro, u.numero].filter(Boolean).join(', ')}
                  </td>
                  <td className={`${cel} text-ink-600 dark:text-ink-300`} title={u.bairro}>{u.bairro}</td>
                  <td className={`${cel} text-ink-600 dark:text-ink-300`} title={u.cidade}>{u.cidade}</td>
                  <td className={`${cel} text-ink-500 dark:text-ink-400`}>{mascaraCep(u.cep)}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{u.uf}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>{total > 0 ? `Mostrando ${inicio}–${fim} de ${total}` : 'Sem registros'}</span>
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

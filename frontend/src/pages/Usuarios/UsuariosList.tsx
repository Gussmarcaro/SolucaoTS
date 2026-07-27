import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Loader2, ServerCrash, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { listarUsuarios } from '@/services/usuarios.service';
import { extrairMensagemErro } from '@/services/http';
import { mascaraCelular, mascaraCep, mascaraCpfCnpj } from '@/lib/masks';
import type { FiltrosUsuario, Paginado, Usuario } from '@/types/usuario';

const PAGE_SIZE = 10;

type ColunaKey = keyof FiltrosUsuario;

const colunas: { key: ColunaKey; label: string; placeholder: string; className?: string }[] = [
  { key: 'nome', label: 'Nome / Razão Social', placeholder: 'Filtrar nome' },
  { key: 'documento', label: 'CPF / CNPJ', placeholder: 'Filtrar documento' },
  { key: 'email', label: 'E-mail', placeholder: 'Filtrar e-mail' },
  { key: 'celular', label: 'Celular', placeholder: 'Filtrar celular' },
  { key: 'logradouro', label: 'Endereço', placeholder: 'Filtrar endereço' },
  { key: 'bairro', label: 'Bairro', placeholder: 'Filtrar bairro' },
  { key: 'cidade', label: 'Cidade', placeholder: 'Filtrar cidade' },
  { key: 'cep', label: 'CEP', placeholder: 'Filtrar CEP' },
  { key: 'uf', label: 'UF', placeholder: 'UF', className: 'w-16' },
];

const vazio: Paginado<Usuario> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

export function UsuariosList({ refreshKey }: { refreshKey: number }) {
  const [filtros, setFiltros] = useState<FiltrosUsuario>({});
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Usuario>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const filtrosDebounced = useDebounce(filtros, 400);
  const filtrosAtivos = useMemo(
    () => Object.values(filtrosDebounced).filter(Boolean).length,
    [filtrosDebounced],
  );

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarUsuarios({ filtros: filtrosDebounced, page, pageSize: PAGE_SIZE })
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
  }, [filtrosDebounced, page, refreshKey]);

  // Volta para a primeira página sempre que os filtros mudam.
  useEffect(() => setPage(1), [filtrosDebounced]);

  const setFiltro = (key: ColunaKey, valor: string) =>
    setFiltros((prev) => ({ ...prev, [key]: valor }));

  const { data, total, totalPages } = resultado;
  const inicio = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const fim = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
          <span className="font-medium text-ink-700 dark:text-ink-200">{total}</span> usuário(s)
          {filtrosAtivos > 0 && (
            <Badge tone="brand">{filtrosAtivos} filtro(s) ativo(s)</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMostrarFiltros((v) => !v)}>
          <Filter className="h-4 w-4" />
          {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {colunas.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
            {mostrarFiltros && (
              <tr className="bg-ink-50/60 dark:bg-ink-800/40">
                {colunas.map((c) => (
                  <th key={c.key} className="px-4 pb-3">
                    <input
                      value={filtros[c.key] ?? ''}
                      onChange={(e) => setFiltro(c.key, e.target.value)}
                      placeholder={c.placeholder}
                      className={`focus-ring h-8 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-normal normal-case text-ink-700 placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 ${c.className ?? ''}`}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                  <p className="mt-2 text-sm text-ink-400">Carregando...</p>
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <ServerCrash className="mx-auto h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">{erro}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    Verifique se a API do backend está em execução.
                  </p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="py-16 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-ink-300" />
                  <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                    Nenhum usuário encontrado.
                  </p>
                </td>
              </tr>
            ) : (
              data.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100">{u.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600 dark:text-ink-300">
                    {mascaraCpfCnpj(u.documento)}
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{u.email}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{mascaraCelular(u.celular)}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{u.logradouro}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{u.bairro}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{u.cidade}</td>
                  <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{mascaraCep(u.cep)}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{u.uf}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
        <span>
          {total > 0 ? `Mostrando ${inicio}–${fim} de ${total}` : 'Sem registros'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || carregando}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="px-1 text-ink-500 dark:text-ink-400">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || carregando}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

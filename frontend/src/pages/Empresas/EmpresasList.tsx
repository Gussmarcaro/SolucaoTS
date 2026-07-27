import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Power,
  ServerCrash,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { listarEmpresas, resolverUrlLogo } from '@/services/empresas.service';
import { extrairMensagemErro } from '@/services/http';
import { mascaraCpfCnpj } from '@/lib/masks';
import { UF_OPTIONS } from '@/lib/ufs';
import type { Empresa, FiltrosEmpresa, Paginado } from '@/types/empresa';

const PAGE_SIZE = 10;
const vazio: Paginado<Empresa> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

interface Props {
  refreshKey: number;
  onVisualizar: (empresa: Empresa) => void;
  onEditar: (empresa: Empresa) => void;
  onAlternarStatus: (empresa: Empresa) => void;
}

type FiltrosForm = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  cidade: string;
  uf: string;
  status: '' | 'ativos' | 'inativos';
};

const filtrosVazios: FiltrosForm = {
  razaoSocial: '', nomeFantasia: '', cnpj: '', cidade: '', uf: '', status: '',
};

export function EmpresasList({ refreshKey, onVisualizar, onEditar, onAlternarStatus }: Props) {
  const [filtros, setFiltros] = useState<FiltrosForm>(filtrosVazios);
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Empresa>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const filtrosDebounced = useDebounce(filtros, 400);

  const filtrosApi = useMemo<FiltrosEmpresa>(() => {
    const f: FiltrosEmpresa = {};
    if (filtrosDebounced.razaoSocial) f.razaoSocial = filtrosDebounced.razaoSocial;
    if (filtrosDebounced.nomeFantasia) f.nomeFantasia = filtrosDebounced.nomeFantasia;
    if (filtrosDebounced.cnpj) f.cnpj = filtrosDebounced.cnpj;
    if (filtrosDebounced.cidade) f.cidade = filtrosDebounced.cidade;
    if (filtrosDebounced.uf) f.uf = filtrosDebounced.uf;
    if (filtrosDebounced.status === 'ativos') f.ativo = true;
    if (filtrosDebounced.status === 'inativos') f.ativo = false;
    return f;
  }, [filtrosDebounced]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarEmpresas({ filtros: filtrosApi, page, pageSize: PAGE_SIZE })
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
  }, [filtrosApi, page, refreshKey]);

  useEffect(() => setPage(1), [filtrosApi]);

  const set = (campo: keyof FiltrosForm, valor: string) =>
    setFiltros((prev) => ({ ...prev, [campo]: valor }));

  const { data, total, totalPages } = resultado;
  const inputCls =
    'focus-ring h-9 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

  return (
    <div className="space-y-4">
      {/* Painel de filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card dark:border-ink-800/70 dark:bg-ink-900 sm:grid-cols-2 lg:grid-cols-6">
        <input className={inputCls} placeholder="Razão social" value={filtros.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} />
        <input className={inputCls} placeholder="Nome fantasia" value={filtros.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
        <input className={inputCls} placeholder="CNPJ" value={filtros.cnpj} onChange={(e) => set('cnpj', e.target.value)} inputMode="numeric" />
        <input className={inputCls} placeholder="Cidade" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)} />
        <Select
          name="uf"
          value={filtros.uf}
          onChange={(e) => set('uf', e.target.value)}
          options={UF_OPTIONS}
          placeholder="UF (todas)"
        />
        <Select
          name="status"
          value={filtros.status}
          onChange={(e) => set('status', e.target.value)}
          options={[
            { value: 'ativos', label: 'Ativos' },
            { value: 'inativos', label: 'Inativos' },
          ]}
          placeholder="Status (todos)"
        />
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Cidade / UF</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <ServerCrash className="mx-auto h-8 w-8 text-red-400" />
                    <p className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">{erro}</p>
                    <p className="mt-1 text-xs text-ink-400">Verifique se a API do backend está em execução.</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-ink-300" />
                    <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Nenhuma empresa encontrada.</p>
                  </td>
                </tr>
              ) : (
                data.map((emp) => {
                  const logo = resolverUrlLogo(emp.logoUrl);
                  return (
                    <tr key={emp.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-50 dark:bg-ink-800">
                            {logo ? (
                              <img src={logo} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Building2 className="h-4 w-4 text-ink-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-800 dark:text-ink-100">{emp.razaoSocial}</p>
                            {emp.nomeFantasia && (
                              <p className="truncate text-xs text-ink-400">{emp.nomeFantasia}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-600 dark:text-ink-300">
                        {mascaraCpfCnpj(emp.cnpj)}
                      </td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                        {emp.cidade} / {emp.uf}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={emp.ativo ? 'success' : 'neutral'}>
                          {emp.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="Visualizar" onClick={() => onVisualizar(emp)}>
                            <Eye className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn title="Editar" onClick={() => onEditar(emp)}>
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title={emp.ativo ? 'Inativar' : 'Reativar'}
                            danger={emp.ativo}
                            onClick={() => onAlternarStatus(emp)}
                          >
                            <Power className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
          <span>{total > 0 ? `${total} empresa(s)` : 'Sem registros'}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1 || carregando} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="px-1 text-ink-500 dark:text-ink-400">
              Página {page} de {totalPages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages || carregando} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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

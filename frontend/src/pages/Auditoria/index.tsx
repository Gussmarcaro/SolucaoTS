import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { extrairMensagemErro } from '@/services/http';
import { auditoriaApi, type FiltrosAuditoria } from '@/services/auditoria.service';
import { listarUsuarios } from '@/services/usuarios.service';
import { ACAO_LABEL, ACAO_TONE, rotuloEntidade, type RegistroAuditoria } from '@/types/auditoria';
import { Alteracoes } from './Alteracoes';
import { baixarCsv } from './exportarCsv';

const PAGE_SIZE = 25;

const ACOES = [
  { value: 'ALTERACAO', label: 'Alteração' },
  { value: 'EXCLUSAO', label: 'Exclusão' },
  { value: 'INATIVACAO', label: 'Inativação' },
  { value: 'REATIVACAO', label: 'Reativação' },
  { value: 'CRIACAO', label: 'Inclusão' },
];

export function dataHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function Auditoria() {
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 400);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [lista, setLista] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);

  useEffect(() => {
    auditoriaApi.entidades().then(setEntidades).catch(() => setEntidades([]));
    // Só quem já operou no sistema interessa como filtro, mas a lista de
    // usuários é curta — vem inteira e é ordenada por nome.
    listarUsuarios({ page: 1, pageSize: 100 })
      .then((r) => setUsuarios(r.data.map((u) => ({ value: u.id, label: u.nome }))))
      .catch(() => setUsuarios([]));
  }, []);

  const consulta = useMemo(
    () => ({ ...filtros, busca: buscaDebounced || undefined }),
    [filtros, buscaDebounced],
  );

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    auditoriaApi
      .listar({ ...consulta, page, pageSize: PAGE_SIZE })
      .then((r) => {
        if (!vivo) return;
        setLista(r.data);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a auditoria.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [consulta, page]);

  useEffect(() => setPage(1), [consulta]);

  const opcoesEntidade = useMemo(
    () => entidades.map((e) => ({ value: e, label: rotuloEntidade(e) })),
    [entidades],
  );

  const set = (campo: keyof FiltrosAuditoria, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor || undefined }));

  /** Exporta o resultado filtrado inteiro, não só a página exibida. */
  async function exportar() {
    setExportando(true);
    try {
      const r = await auditoriaApi.listar({ ...consulta, page: 1, pageSize: 100 });
      const paginas = Math.min(r.totalPages, 20); // teto de 2.000 linhas
      let registros = r.data;
      for (let p = 2; p <= paginas; p++) {
        registros = registros.concat((await auditoriaApi.listar({ ...consulta, page: p, pageSize: 100 })).data);
      }
      baixarCsv(registros);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível exportar.'));
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle="Alterações e exclusões feitas no sistema, com autor, data e o que mudou."
        actions={
          <Button variant="secondary" onClick={exportar} disabled={exportando || carregando || total === 0}>
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="space-y-3 border-b border-ink-100 p-4 dark:border-ink-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo registro afetado (razão social, nome, número...)"
              className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Select
              name="entidade"
              label="Cadastro"
              value={filtros.entidade ?? ''}
              onChange={(e) => set('entidade', e.target.value)}
              options={opcoesEntidade}
              placeholder="Todos"
            />
            <Select
              name="usuarioId"
              label="Usuário"
              value={filtros.usuarioId ?? ''}
              onChange={(e) => set('usuarioId', e.target.value)}
              options={usuarios}
              placeholder="Todos"
            />
            <Select
              name="acao"
              label="Ação"
              value={filtros.acao ?? ''}
              onChange={(e) => set('acao', e.target.value)}
              options={ACOES}
              placeholder="Todas"
            />
            <Input name="de" label="De" type="date" value={filtros.de ?? ''} onChange={(e) => set('de', e.target.value)} />
            <Input name="ate" label="Até" type="date" value={filtros.ate ?? ''} onChange={(e) => set('ate', e.target.value)} />
          </div>
        </div>

        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {carregando ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
            </div>
          ) : erro ? (
            <p className="py-16 text-center text-sm font-medium text-red-500">{erro}</p>
          ) : lista.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-500 dark:text-ink-400">
              Nenhum registro de auditoria com esses filtros.
            </p>
          ) : (
            lista.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDetalhe(r)}
                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACAO_TONE[r.acao]}>{ACAO_LABEL[r.acao]}</Badge>
                  <span className="text-[13px] font-medium text-ink-800 dark:text-ink-100">
                    {rotuloEntidade(r.entidade)}
                    {r.registroDescricao && (
                      <span className="text-ink-500 dark:text-ink-400"> · {r.registroDescricao}</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-400">
                    por {r.usuarioNome} · {dataHora(r.ocorridoEm)}
                  </span>
                </div>
                <div className="mt-1">
                  <Alteracoes acao={r.acao} alteracoes={r.alteracoes} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
          <span>{total} registro(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1 || carregando} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span>Página {page} de {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages || carregando} onClick={() => setPage((p) => p + 1)}>
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhe do registro" size="lg">
        {detalhe && <DetalheRegistro registro={detalhe} />}
      </Modal>
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{rotulo}</dt>
      <dd className="mt-0.5 break-all text-sm text-ink-800 dark:text-ink-100">{valor}</dd>
    </div>
  );
}

function DetalheRegistro({ registro: r }: { registro: RegistroAuditoria }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={ACAO_TONE[r.acao]}>{ACAO_LABEL[r.acao]}</Badge>
        <span className="text-sm font-semibold text-ink-900 dark:text-ink-50">
          {rotuloEntidade(r.entidade)}
          {r.registroDescricao && <span className="font-normal text-ink-500"> · {r.registroDescricao}</span>}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Linha rotulo="Quando" valor={dataHora(r.ocorridoEm)} />
        <Linha rotulo="Autor" valor={r.usuarioNome} />
        <Linha rotulo="Registro afetado" valor={r.registroId} />
        <Linha rotulo="Rota chamada" valor={r.rota ?? '—'} />
      </dl>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          {r.acao === 'EXCLUSAO' ? 'Dados do registro excluído' : 'O que mudou'}
        </h4>
        <Alteracoes acao={r.acao} alteracoes={r.alteracoes} />
      </div>
    </div>
  );
}

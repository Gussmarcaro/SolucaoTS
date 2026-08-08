import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { extrairMensagemErro } from '@/services/http';
import { auditoriaApi, type FiltrosAuditoria } from '@/services/auditoria.service';
import { ACAO_LABEL, ACAO_TONE, rotuloEntidade, type RegistroAuditoria } from '@/types/auditoria';
import { Alteracoes } from './Alteracoes';

const PAGE_SIZE = 25;

const ACOES = [
  { value: 'ALTERACAO', label: 'Alteração' },
  { value: 'EXCLUSAO', label: 'Exclusão' },
  { value: 'INATIVACAO', label: 'Inativação' },
  { value: 'REATIVACAO', label: 'Reativação' },
  { value: 'CRIACAO', label: 'Inclusão' },
];

function dataHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function Auditoria() {
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [entidades, setEntidades] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [lista, setLista] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    auditoriaApi.entidades().then(setEntidades).catch(() => setEntidades([]));
  }, []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    auditoriaApi
      .listar({ ...filtros, page, pageSize: PAGE_SIZE })
      .then((r) => {
        if (!vivo) return;
        setLista(r.data);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a auditoria.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [filtros, page]);

  useEffect(() => setPage(1), [filtros]);

  const opcoesEntidade = useMemo(
    () => entidades.map((e) => ({ value: e, label: rotuloEntidade(e) })),
    [entidades],
  );

  const set = (campo: keyof FiltrosAuditoria, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor || undefined }));

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle="Alterações e exclusões feitas no sistema, com autor, data e o que mudou."
      />

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="grid grid-cols-1 gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:grid-cols-4">
          <Select
            name="entidade"
            label="Cadastro"
            value={filtros.entidade ?? ''}
            onChange={(e) => set('entidade', e.target.value)}
            options={opcoesEntidade}
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
          <Input
            name="de"
            label="De"
            type="date"
            value={filtros.de ?? ''}
            onChange={(e) => set('de', e.target.value)}
          />
          <Input
            name="ate"
            label="Até"
            type="date"
            value={filtros.ate ?? ''}
            onChange={(e) => set('ate', e.target.value)}
          />
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
              Nenhum registro de auditoria no período.
            </p>
          ) : (
            lista.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACAO_TONE[r.acao]}>{ACAO_LABEL[r.acao]}</Badge>
                  <span className="text-[13px] font-medium text-ink-800 dark:text-ink-100">
                    {rotuloEntidade(r.entidade)}
                  </span>
                  <span className="text-xs text-ink-400">
                    por {r.usuarioNome} · {dataHora(r.ocorridoEm)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Alteracoes acao={r.acao} alteracoes={r.alteracoes} />
                </div>
              </div>
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
    </>
  );
}

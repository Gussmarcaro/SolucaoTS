import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, FolderOpen, Loader2, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { IconBtn } from '@/pages/PrestacaoContas/blocos/_ui';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { useDebounce } from '@/hooks/useDebounce';
import { criarPrestacao, listarPrestacoes } from '@/services/prestacoes.service';
import { listarAjustes } from '@/services/ajustes.service';
import { extrairMensagemErro } from '@/services/http';
import {
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_TONE,
  type Paginado,
  type Prestacao,
  type StatusPrestacao,
} from '@/types/prestacao';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';

const PAGE_SIZE = 15;
const vazio: Paginado<Prestacao> = { data: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 90, minWidth: 80, align: 'center', movivel: false },
  { key: 'ajuste', label: 'Ajuste', width: 220, sortKey: 'ajusteCodigo' },
  { key: 'entidade', label: 'Entidade', width: 260, sortKey: 'entidadeNome' },
  { key: 'exercicio', label: 'Exercício', width: 190, sortKey: 'ano' },
  { key: 'protocolo', label: 'Protocolo', width: 170, sortKey: 'protocolo' },
  { key: 'status', label: 'Status', width: 150, sortKey: 'status' },
];

export function PrestacaoContas() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Paginado<Prestacao>>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const buscaDebounced = useDebounce(busca, 400);

  const filtros = useMemo(() => (status ? { status } : {}), [status]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    listarPrestacoes({ filtros, busca: buscaDebounced, page, pageSize: PAGE_SIZE })
      .then((r) => vivo && setResultado(r))
      .catch((e) => {
        if (!vivo) return;
        setErro(extrairMensagemErro(e, 'Não foi possível carregar as prestações.'));
        setResultado(vazio);
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [filtros, buscaDebounced, page, refreshKey]);

  useEffect(() => setPage(1), [filtros, buscaDebounced]);

  const { data, total, totalPages } = resultado;

  return (
    <>
      <PageHeader
        title="Prestação de Contas"
        subtitle="Montagem, validação e transmissão dos documentos à API do Audesp (TCESP)."
        actions={
          <Button variant="success" onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" />
            Nova Prestação
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por ajuste, entidade, protocolo..."
              className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-[12px] text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={(Object.keys(STATUS_PRESTACAO_LABEL) as StatusPrestacao[]).map((s) => ({
                value: s,
                label: STATUS_PRESTACAO_LABEL[s],
              }))}
              placeholder="Status (todos)"
            />
          </div>
        </div>

        <GradeSimples
          storageKey="@SolucaoTS:grid:prestacoes:v1"
          colunas={COLUNAS}
          dados={data}
          chave={(p) => p.id}
          carregando={carregando}
          erro={erro}
          vazio="Nenhuma prestação. Crie a primeira."
          onDuploClique={(p) => navigate(`/prestacao-contas/${p.id}`)}
          valorOrdenacao={(campo, p) => {
            if (campo === 'ajusteCodigo') return p.ajusteCodigo;
            if (campo === 'entidadeNome') return p.entidadeNome;
            if (campo === 'ano') return p.ano;
            if (campo === 'protocolo') return p.protocolo;
            if (campo === 'status') return STATUS_PRESTACAO_LABEL[p.status];
            return null;
          }}
          renderCell={(coluna, p) => {
            switch (coluna) {
              case 'acoes':
                return (
                  <IconBtn title="Abrir prestação" onClick={() => navigate(`/prestacao-contas/${p.id}`)}>
                    <FolderOpen className="h-4 w-4" />
                  </IconBtn>
                );
              case 'ajuste':
                return (
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-ink-700 dark:text-ink-200">{p.ajusteCodigo}</p>
                    <p className="truncate text-xs text-ink-400">{TIPO_AJUSTE_LABEL[p.ajusteTipo] ?? p.tipoDocumento}</p>
                  </div>
                );
              case 'entidade':
                return <span className="block truncate text-ink-600 dark:text-ink-300" title={p.entidadeNome}>{p.entidadeNome}</span>;
              case 'exercicio':
                return (
                  <span className="flex min-w-0 items-center gap-1 text-ink-500 dark:text-ink-400">
                    <span className="truncate">{p.ano} / mês {p.mes}</span>
                    {p.ehRetificacao && <Badge tone="neutral">retificação</Badge>}
                  </span>
                );
              case 'protocolo':
                return <span className="block truncate font-mono text-xs text-ink-500 dark:text-ink-400">{p.protocolo ?? '—'}</span>;
              case 'status':
                return <Badge tone={STATUS_PRESTACAO_TONE[p.status]}>{STATUS_PRESTACAO_LABEL[p.status]}</Badge>;
              default:
                return null;
            }
          }}
        />

        <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
          <span>{total > 0 ? `${total} prestação(ões)` : 'Sem registros'}</span>
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

      <Modal open={novo} onClose={() => setNovo(false)} title="Nova Prestação de Contas" subtitle="Prestação anual e consolidada (descritor mês = 12)." size="lg">
        <NovaPrestacaoForm
          onCancel={() => setNovo(false)}
          onSuccess={(id) => {
            setNovo(false);
            setRefreshKey((k) => k + 1);
            navigate(`/prestacao-contas/${id}`);
          }}
        />
      </Modal>
    </>
  );
}

function NovaPrestacaoForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: (id: string) => void }) {
  const anoCorrente = new Date().getFullYear();
  const [ajustes, setAjustes] = useState<{ value: string; label: string }[]>([]);
  const [carregandoAjustes, setCarregandoAjustes] = useState(true);
  const [ajusteId, setAjusteId] = useState('');
  const [ano, setAno] = useState(String(anoCorrente));
  const [ehRetificacao, setEhRetificacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarAjustes({ page: 1, pageSize: 100, orderBy: 'codigoAjuste', orderDir: 'asc' })
      .then((r) => vivo && setAjustes(r.data.map((a) => ({
        value: a.id,
        label: `${a.descricaoResumida ?? a.codigoAjuste} — ${a.entidadeNome}`,
      }))))
      .catch(() => vivo && setAjustes([]))
      .finally(() => vivo && setCarregandoAjustes(false));
    return () => {
      vivo = false;
    };
  }, []);

  const semAjustes = !carregandoAjustes && ajustes.length === 0;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!ajusteId) return setErro('Selecione o ajuste.');
    const anoNum = Number(ano);
    if (!anoNum || anoNum < 2025 || anoNum > anoCorrente) return setErro(`Exercício entre 2025 e ${anoCorrente}.`);
    setSalvando(true);
    try {
      const p = await criarPrestacao({ ajusteId, ano: anoNum, ehRetificacao });
      onSuccess(p.id);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível criar a prestação.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {semAjustes && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Cadastre um Ajuste antes de criar uma prestação.</span>
        </div>
      )}
      <Select
        label="Ajuste *"
        name="ajusteId"
        value={ajusteId}
        onChange={(e) => setAjusteId(e.target.value)}
        options={ajustes}
        placeholder={carregandoAjustes ? 'Carregando...' : 'Selecione o ajuste'}
      />
      <Input label="Exercício (ano do repasse) *" name="ano" value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder={String(anoCorrente)} />
      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input type="checkbox" checked={ehRetificacao} onChange={(e) => setEhRetificacao(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
        É uma retificação de prestação já enviada
      </label>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando || semAjustes}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Criando...' : 'Criar Prestação'}
        </Button>
      </div>
    </form>
  );
}

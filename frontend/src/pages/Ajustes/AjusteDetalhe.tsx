import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatarMoeda } from '@/lib/masks';
import { buscarAjuste } from '@/services/ajustes.service';
import { extrairMensagemErro } from '@/services/http';
import { STATUS_AJUSTE_LABEL, TIPO_AJUSTE_LABEL, type Ajuste } from '@/types/ajuste';
import { AjusteView } from './AjusteView';
import { AjusteForm } from './AjusteForm';
import { TermosAditivosTab } from './tabs/TermosAditivosTab';
import { EmpenhosTab } from './tabs/EmpenhosTab';
import { PlanoAplicacaoTab } from './tabs/PlanoAplicacaoTab';
import { CronogramaTab } from './tabs/CronogramaTab';
import { ProgramasMetasTab } from './tabs/ProgramasMetasTab';
import { BensAjusteTab } from './tabs/BensAjusteTab';

type TabKey = 'dados' | 'termos' | 'empenhos' | 'metas' | 'plano' | 'cronograma' | 'bens';

const TABS: { key: TabKey; label: string; embreve?: boolean }[] = [
  { key: 'dados', label: 'Dados' },
  { key: 'termos', label: 'Termos Aditivos' },
  { key: 'empenhos', label: 'Empenhos' },
  { key: 'metas', label: 'Programas e Metas' },
  { key: 'plano', label: 'Plano de Aplicação' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'bens', label: 'Bens Cedidos' },
];

export function AjusteDetalhe() {
  const { id = '' } = useParams();
  const [ajuste, setAjuste] = useState<Ajuste | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<TabKey>('dados');
  const [editando, setEditando] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    buscarAjuste(id)
      .then((r) => vivo && setAjuste(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar o ajuste.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [id, refreshKey]);

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (erro || !ajuste) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <ServerCrash className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-ink-600 dark:text-ink-300">{erro ?? 'Ajuste não encontrado.'}</p>
        <Link to="/cadastro/ajustes">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar aos ajustes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6">
        <Link to="/cadastro/ajustes" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" />
          Ajustes
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {ajuste.nomeResumido ? (
              <>
                <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
                  {ajuste.nomeResumido}
                </h1>
                <p className="font-mono text-xs text-ink-400">{ajuste.codigoAjuste}</p>
              </>
            ) : (
              <h1 className="font-mono text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
                {ajuste.codigoAjuste}
              </h1>
            )}
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{ajuste.entidadeNome}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{TIPO_AJUSTE_LABEL[ajuste.tipoAjuste]}</Badge>
              <Badge tone={ajuste.status === 'ENVIADO' ? 'success' : 'warning'}>
                {STATUS_AJUSTE_LABEL[ajuste.status]}
              </Badge>
              <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                {formatarMoeda(ajuste.valorGlobal)}
              </span>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" />
            Editar dados
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-ink-200/70 dark:border-ink-800/70">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setAba(t.key)}
            className={cn(
              'relative -mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              aba === t.key
                ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            )}
          >
            {t.label}
            {t.embreve && <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 dark:bg-ink-800">em breve</span>}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        {aba === 'dados' && <AjusteView ajuste={ajuste} />}
        {aba === 'termos' && <TermosAditivosTab ajusteId={ajuste.id} />}
        {aba === 'empenhos' && <EmpenhosTab ajusteId={ajuste.id} />}
        {aba === 'metas' && <ProgramasMetasTab ajusteId={ajuste.id} />}
        {aba === 'plano' && <PlanoAplicacaoTab ajusteId={ajuste.id} />}
        {aba === 'cronograma' && <CronogramaTab ajusteId={ajuste.id} />}
        {aba === 'bens' && <BensAjusteTab ajusteId={ajuste.id} />}
      </div>

      {/* Edição dos dados do ajuste */}
      <Modal open={editando} onClose={() => setEditando(false)} title="Editar Ajuste" size="2xl">
        <AjusteForm
          ajuste={ajuste}
          onSuccess={() => {
            setEditando(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setEditando(false)}
        />
      </Modal>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction, Loader2, Pencil, ServerCrash } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { mascaraCpfCnpj } from '@/lib/masks';
import { buscarEntidade } from '@/services/entidades.service';
import { extrairMensagemErro } from '@/services/http';
import type { Entidade } from '@/types/entidade';
import { EntidadeForm } from './EntidadeForm';
import { EntidadeView } from './EntidadeView';
import { DiretoriaTab } from './tabs/DiretoriaTab';
import { ConselhosTab } from './tabs/ConselhosTab';
import { RegularidadeTab } from './tabs/RegularidadeTab';

type TabKey = 'geral' | 'diretoria' | 'conselhos' | 'regularidade' | 'qualificacoes' | 'regulamentos';

const TABS: { key: TabKey; label: string; futura?: boolean }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'diretoria', label: 'Diretoria' },
  { key: 'conselhos', label: 'Conselhos' },
  { key: 'regularidade', label: 'Regularidade Fiscal / Cadastral' },
  { key: 'qualificacoes', label: 'Qualificações', futura: true },
  { key: 'regulamentos', label: 'Regulamentos', futura: true },
];

/**
 * Dossiê da Entidade Beneficiária — mesmo padrão do dossiê do Ajuste: uma
 * página com abas, em vez de um modal só. Os dados que já existiam ficam na
 * aba Geral; as demais guardam as informações complementares.
 */
export function EntidadeDetalhe() {
  const { id = '' } = useParams();
  const [entidade, setEntidade] = useState<Entidade | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<TabKey>('geral');
  const [editando, setEditando] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    buscarEntidade(id)
      .then((r) => vivo && setEntidade(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a entidade.')))
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

  if (erro || !entidade) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <ServerCrash className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
          {erro ?? 'Entidade não encontrada.'}
        </p>
        <Link to="/cadastro/entidades">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar às entidades
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          to="/cadastro/entidades"
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Entidades / Beneficiárias
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
              {entidade.razaoSocial}
            </h1>
            {entidade.nomeFantasia && (
              <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{entidade.nomeFantasia}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-500 dark:text-ink-400">
                {mascaraCpfCnpj(entidade.cnpj)}
              </span>
              <Badge tone={entidade.ativo ? 'success' : 'neutral'}>
                {entidade.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
          {aba === 'geral' && (
            <Button variant="secondary" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              Editar dados
            </Button>
          )}
        </div>
      </div>

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
            {t.futura && (
              <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 dark:bg-ink-800">
                em breve
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        {aba === 'geral' && <EntidadeView entidade={entidade} />}
        {aba === 'diretoria' && <DiretoriaTab entidadeId={entidade.id} />}
        {aba === 'conselhos' && <ConselhosTab entidadeId={entidade.id} />}
        {aba === 'regularidade' && <RegularidadeTab entidadeId={entidade.id} />}
        {aba === 'qualificacoes' && <EmDesenvolvimento titulo="Qualificações" />}
        {aba === 'regulamentos' && <EmDesenvolvimento titulo="Regulamentos" />}
      </div>

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar Entidade" size="2xl">
        <EntidadeForm
          entidade={entidade}
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

/** Abas já previstas na estrutura, mas ainda sem conteúdo. */
function EmDesenvolvimento({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Construction className="h-8 w-8 text-ink-300 dark:text-ink-600" />
      <p className="text-sm font-medium text-ink-600 dark:text-ink-300">{titulo}</p>
      <p className="text-sm text-ink-400">Funcionalidade em desenvolvimento.</p>
    </div>
  );
}

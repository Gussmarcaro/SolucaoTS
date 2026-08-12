import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Construction,
  FileText,
  Loader2,
  Pencil,
  Scale,
  ServerCrash,
  ShieldCheck,
  Users,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
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

/**
 * Cores das abas. As classes ficam escritas por extenso porque o Tailwind varre
 * o código em busca de nomes literais — montar `bg-${cor}-500` não geraria CSS.
 */
type Cor = { ativo: string; inativo: string; barra: string };

const CORES: Record<string, Cor> = {
  azul: {
    ativo: 'bg-blue-600 text-white shadow-sm ring-blue-600/25',
    inativo:
      'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20',
    barra: 'bg-blue-600',
  },
  violeta: {
    ativo: 'bg-violet-600 text-white shadow-sm ring-violet-600/25',
    inativo:
      'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20',
    barra: 'bg-violet-600',
  },
  ambar: {
    ativo: 'bg-amber-500 text-white shadow-sm ring-amber-500/25',
    inativo:
      'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20',
    barra: 'bg-amber-500',
  },
  esmeralda: {
    ativo: 'bg-emerald-600 text-white shadow-sm ring-emerald-600/25',
    inativo:
      'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20',
    barra: 'bg-emerald-600',
  },
  rosa: {
    ativo: 'bg-rose-500 text-white shadow-sm ring-rose-500/25',
    inativo:
      'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20',
    barra: 'bg-rose-500',
  },
  ciano: {
    ativo: 'bg-cyan-600 text-white shadow-sm ring-cyan-600/25',
    inativo:
      'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20',
    barra: 'bg-cyan-600',
  },
};

const TABS: { key: TabKey; label: string; icone: LucideIcon; cor: keyof typeof CORES; futura?: boolean }[] = [
  { key: 'geral', label: 'Geral', icone: FileText, cor: 'azul' },
  { key: 'diretoria', label: 'Diretoria', icone: Users, cor: 'violeta' },
  { key: 'conselhos', label: 'Conselhos', icone: Scale, cor: 'ambar' },
  { key: 'regularidade', label: 'Regularidade Fiscal / Cadastral', icone: ShieldCheck, cor: 'esmeralda' },
  { key: 'qualificacoes', label: 'Qualificações', icone: Award, cor: 'rosa', futura: true },
  { key: 'regulamentos', label: 'Regulamentos', icone: BookOpen, cor: 'ciano', futura: true },
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

      {/* Abas em pastilhas coloridas: cada área tem sua cor, e a ativa fica
          preenchida. A faixa fina no topo do painel repete a cor da aba
          selecionada, ligando a pastilha ao conteúdo. */}
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const cor = CORES[t.cor];
          const ativa = aba === t.key;
          const Icone = t.icone;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setAba(t.key)}
              aria-current={ativa ? 'page' : undefined}
              className={cn(
                'focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition-all',
                ativa ? cor.ativo : cn(cor.inativo, 'ring-transparent'),
              )}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {t.label}
              {t.futura && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    ativa ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                  )}
                >
                  em breve
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className={cn('h-1', CORES[TABS.find((t) => t.key === aba)!.cor].barra)} />
        <div className="p-5">
          {aba === 'geral' && <EntidadeView entidade={entidade} />}
          {aba === 'diretoria' && <DiretoriaTab entidadeId={entidade.id} />}
          {aba === 'conselhos' && <ConselhosTab entidadeId={entidade.id} />}
          {aba === 'regularidade' && <RegularidadeTab entidadeId={entidade.id} />}
          {aba === 'qualificacoes' && <EmDesenvolvimento titulo="Qualificações" />}
          {aba === 'regulamentos' && <EmDesenvolvimento titulo="Regulamentos" />}
        </div>
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

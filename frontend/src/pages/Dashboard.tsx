import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Truck,
  UserRound,
  Boxes,
  UserCog,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { listarEntidades } from '@/services/entidades.service';
import { listarFornecedores } from '@/services/fornecedores.service';
import { listarColaboradores } from '@/services/colaboradores.service';
import { listarContratos } from '@/services/contratos.service';
import { listarBensCedidos } from '@/services/bensCedidos.service';
import { listarServidoresCedidos } from '@/services/servidoresCedidos.service';
import { listarAjustes } from '@/services/ajustes.service';
import { listarPrestacoes } from '@/services/prestacoes.service';
import { STATUS_PRESTACAO_LABEL, STATUS_PRESTACAO_TONE, type Prestacao } from '@/types/prestacao';
import { prazoPrestacao, diasAte, rotuloPrazo, tonePrazo } from '@/lib/prazos';

interface PrazoItem {
  id: string;
  orgao: string;
  periodo: string;
  vence: string;
  tone: 'danger' | 'warning' | 'neutral';
  dias: number;
}

type Contagens = Record<string, number | null>;

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0] ?? '';
  const [contagens, setContagens] = useState<Contagens | null>(null);
  const [prazos, setPrazos] = useState<PrazoItem[] | null>(null);
  const [atividade, setAtividade] = useState<Prestacao[] | null>(null);
  const ciclo = prazoPrestacao();

  useEffect(() => {
    let vivo = true;
    const { exercicio, deadline } = prazoPrestacao();
    Promise.allSettled([
      listarAjustes({ page: 1, pageSize: 100 }),
      listarPrestacoes({ filtros: { ano: exercicio }, page: 1, pageSize: 100 }),
      listarPrestacoes({ orderBy: 'atualizadoEm', orderDir: 'desc', page: 1, pageSize: 5 }),
    ]).then((res) => {
      if (!vivo) return;
      const ajustes = res[0].status === 'fulfilled' ? res[0].value.data : [];
      const doExercicio = res[1].status === 'fulfilled' ? res[1].value.data : [];
      const recentes = res[2].status === 'fulfilled' ? res[2].value.data : [];

      const statusPorAjuste = new Map<string, string>();
      for (const p of doExercicio) {
        if (p.status === 'ARMAZENADO' || !statusPorAjuste.has(p.ajusteId)) statusPorAjuste.set(p.ajusteId, p.status);
      }
      const dias = diasAte(deadline);
      const itens: PrazoItem[] = ajustes
        .filter((a) => new Date(a.dataAssinatura).getFullYear() <= exercicio)
        .filter((a) => statusPorAjuste.get(a.id) !== 'ARMAZENADO')
        .map((a) => ({
          id: a.id,
          orgao: `${a.codigoAjuste} — ${a.entidadeNome}`,
          periodo: statusPorAjuste.get(a.id) === 'ENVIADO' ? `Exercício ${exercicio} · enviada, aguardando` : `Prestação do exercício ${exercicio}`,
          vence: rotuloPrazo(dias),
          tone: tonePrazo(dias),
          dias,
        }))
        .sort((x, y) => x.dias - y.dias)
        .slice(0, 6);
      setPrazos(itens);
      setAtividade(recentes);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    const um = { page: 1, pageSize: 1 };
    Promise.allSettled([
      listarEntidades(um),
      listarFornecedores(um),
      listarColaboradores(um),
      listarContratos(um),
      listarBensCedidos(um),
      listarServidoresCedidos(um),
    ]).then((res) => {
      if (!vivo) return;
      const total = (i: number) =>
        res[i].status === 'fulfilled' ? (res[i] as PromiseFulfilledResult<{ total: number }>).value.total : null;
      setContagens({
        entidades: total(0),
        fornecedores: total(1),
        colaboradores: total(2),
        contratos: total(3),
        bens: total(4),
        servidores: total(5),
      });
    });
    return () => {
      vivo = false;
    };
  }, []);

  const fmt = (chave: string): string => {
    if (!contagens) return '…';
    const v = contagens[chave];
    return v == null ? '—' : String(v);
  };

  const cards = [
    { chave: 'entidades', label: 'Entidades beneficiárias', icon: Building2, tone: 'brand' as const },
    { chave: 'fornecedores', label: 'Fornecedores / Prestadores', icon: Truck, tone: 'brand' as const },
    { chave: 'colaboradores', label: 'Colaboradores', icon: UserRound, tone: 'emerald' as const },
    { chave: 'contratos', label: 'Contratos firmados', icon: FileText, tone: 'amber' as const },
    { chave: 'bens', label: 'Bens cedidos', icon: Boxes, tone: 'brand' as const },
    { chave: 'servidores', label: 'Servidores cedidos', icon: UserCog, tone: 'emerald' as const },
  ];

  return (
    <>
      <PageHeader
        title={`${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''} 👋`}
        subtitle="Aqui está o panorama das prestações de contas ao Terceiro Setor."
        actions={
          <Button variant="success" size="md" onClick={() => navigate('/cadastro/ajustes')}>
            <Plus className="h-4 w-4" />
            Novo Ajuste
          </Button>
        }
      />

      {/* KPIs — contagens reais dos cadastros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.chave} label={c.label} value={fmt(c.chave)} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximos prazos — Prestação de Contas (30/06) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prazo da Prestação de Contas</CardTitle>
            <Badge tone="brand">Exercício {ciclo.exercicio}</Badge>
          </CardHeader>
          <CardBody className="pt-3">
            <p className="mb-3 text-xs text-ink-400">
              Entrega até <span className="font-medium text-ink-600 dark:text-ink-300">30/06/{ciclo.deadline.getFullYear()}</span> (repasses de {ciclo.exercicio}). Ajustes sem prestação <strong>Armazenada</strong>:
            </p>
            {prazos == null ? (
              <p className="py-6 text-center text-sm text-ink-400">Carregando…</p>
            ) : prazos.length === 0 ? (
              <p className="flex items-center gap-2 py-6 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Nenhuma prestação pendente para o exercício {ciclo.exercicio}.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {prazos.map((p) => (
                  <li key={p.id} onClick={() => navigate('/prestacao-contas')} className="flex cursor-pointer items-center justify-between gap-4 py-3 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-ink-800 dark:text-ink-100">{p.orgao}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{p.periodo}</p>
                    </div>
                    <Badge tone={p.tone}>{p.vence}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1 text-xs text-ink-400">
              <ArrowRight className="h-3.5 w-3.5" />
              Os prazos de cadastro (dias úteis) dependem do calendário oficial de feriados — não exibidos aqui.
            </p>
          </CardBody>
        </Card>

        {/* Atividade recente — prestações */}
        <Card>
          <CardHeader>
            <CardTitle>Prestações recentes</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            {atividade == null ? (
              <p className="py-6 text-center text-sm text-ink-400">Carregando…</p>
            ) : atividade.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">Nenhuma prestação ainda.</p>
            ) : (
              <ul className="space-y-3">
                {atividade.map((p) => (
                  <li key={p.id} onClick={() => navigate(`/prestacao-contas/${p.id}`)} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-1.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-ink-700 dark:text-ink-200">{p.ajusteCodigo}</p>
                      <p className="mt-0.5 text-xs text-ink-400">Exercício {p.ano} · {tempoRelativo(p.atualizadoEm)}</p>
                    </div>
                    <Badge tone={STATUS_PRESTACAO_TONE[p.status]}>{STATUS_PRESTACAO_LABEL[p.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

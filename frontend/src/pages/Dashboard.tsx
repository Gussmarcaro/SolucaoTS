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
  Clock,
  AlertTriangle,
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
import { cn } from '@/lib/cn';

/** Prazos e atividades ainda são ilustrativos (dependem dos módulos Ajustes e Prestação). */
const prazos = [
  { orgao: 'Convênio 023/2025 — Instituto Vida', periodo: '2º Quadrimestre', vence: 'em 3 dias', tone: 'danger' as const },
  { orgao: 'Termo Colaboração 011/2025 — APAE', periodo: 'Anual 2025', vence: 'em 9 dias', tone: 'warning' as const },
  { orgao: 'Convênio 040/2025 — Lar São Vicente', periodo: '2º Quadrimestre', vence: 'em 15 dias', tone: 'neutral' as const },
  { orgao: 'Contrato Gestão 002/2025 — OS Saúde', periodo: '2º Quadrimestre', vence: 'em 21 dias', tone: 'neutral' as const },
];

const atividades = [
  { icon: CheckCircle2, color: 'text-emerald-500', text: 'Prestação do Convênio 018/2025 foi', em: 'Armazenada', quando: 'há 2h' },
  { icon: AlertTriangle, color: 'text-red-500', text: 'Prestação 015/2025 retornou', em: 'Rejeitada', quando: 'há 5h' },
  { icon: Clock, color: 'text-brand-500', text: 'Novo ajuste 040/2025 em', em: 'Elaboração', quando: 'ontem' },
  { icon: CheckCircle2, color: 'text-emerald-500', text: 'Importação do Plano de Aplicação', em: 'concluída', quando: 'ontem' },
];

type Contagens = Record<string, number | null>;

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
          <Button size="md" onClick={() => navigate('/cadastro/ajustes')}>
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
        {/* Próximos prazos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próximos prazos legais</CardTitle>
            <Badge tone="neutral">Exemplo</Badge>
          </CardHeader>
          <CardBody className="pt-3">
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {prazos.map((p) => (
                <li key={p.orgao} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{p.orgao}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{p.periodo}</p>
                  </div>
                  <Badge tone={p.tone}>{p.vence}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1 text-xs text-ink-400">
              <ArrowRight className="h-3.5 w-3.5" />
              Passa a usar dados reais quando o módulo Ajustes estiver ativo.
            </p>
          </CardBody>
        </Card>

        {/* Atividade recente */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <Badge tone="neutral">Exemplo</Badge>
          </CardHeader>
          <CardBody className="pt-3">
            <ul className="space-y-4">
              {atividades.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <a.icon className={cn('mt-0.5 h-4 w-4 shrink-0', a.color)} />
                  <div>
                    <p className="text-sm text-ink-700 dark:text-ink-200">
                      {a.text}{' '}
                      <span className="font-semibold text-ink-900 dark:text-ink-50">{a.em}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">{a.quando}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

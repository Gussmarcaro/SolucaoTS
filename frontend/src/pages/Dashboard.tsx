import {
  FileText,
  ClipboardCheck,
  CalendarClock,
  CircleDollarSign,
  Plus,
  Download,
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
import { cn } from '@/lib/cn';

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

export function Dashboard() {
  return (
    <>
      <PageHeader
        title="Bom dia, Gustavo 👋"
        subtitle="Aqui está o panorama das prestações de contas ao Terceiro Setor."
        actions={
          <>
            <Button variant="secondary" size="md">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button size="md">
              <Plus className="h-4 w-4" />
              Novo Ajuste
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ajustes ativos" value="28" icon={FileText} tone="brand" trend={{ value: '12%', direction: 'up' }} />
        <StatCard label="Prestações pendentes" value="3" icon={ClipboardCheck} tone="amber" hint="1 rejeitada para corrigir" />
        <StatCard label="Prazos a vencer (30d)" value="5" icon={CalendarClock} tone="red" trend={{ value: '2', direction: 'up' }} />
        <StatCard label="Valor repassado (2025)" value="R$ 4,2 mi" icon={CircleDollarSign} tone="emerald" trend={{ value: '8%', direction: 'up' }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximos prazos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próximos prazos legais</CardTitle>
            <Button variant="ghost" size="sm">
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
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
          </CardBody>
        </Card>

        {/* Atividade recente */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
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

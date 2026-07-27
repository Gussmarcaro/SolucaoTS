import { Plus, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

const prioridadeTone: Record<Prioridade, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  BAIXA: 'neutral',
  MEDIA: 'brand',
  ALTA: 'warning',
  URGENTE: 'danger',
};

interface Coluna {
  titulo: string;
  cor: string;
  tarefas: { titulo: string; ajuste: string; prazo: string; prioridade: Prioridade }[];
}

const colunas: Coluna[] = [
  {
    titulo: 'Pendente',
    cor: 'bg-ink-300 dark:bg-ink-600',
    tarefas: [
      { titulo: 'Coletar documentos fiscais', ajuste: 'Convênio 040/2025', prazo: '28/07', prioridade: 'MEDIA' },
      { titulo: 'Validar CPFs da relação de empregados', ajuste: 'Contrato Gestão 002/2025', prazo: '30/07', prioridade: 'BAIXA' },
    ],
  },
  {
    titulo: 'Em andamento',
    cor: 'bg-brand-500',
    tarefas: [
      { titulo: 'Montar prestação 2º quadrimestre', ajuste: 'Convênio 023/2025', prazo: '27/07', prioridade: 'URGENTE' },
      { titulo: 'Importar Cronograma de Desembolso', ajuste: 'Termo Colab. 011/2025', prazo: '02/08', prioridade: 'ALTA' },
    ],
  },
  {
    titulo: 'Concluída',
    cor: 'bg-emerald-500',
    tarefas: [
      { titulo: 'Transmitir prestação 018/2025', ajuste: 'Convênio 018/2025', prazo: '24/07', prioridade: 'ALTA' },
    ],
  },
];

export function Tarefas() {
  return (
    <>
      <PageHeader
        title="Tarefas & Prazos"
        subtitle="Controle operacional das obrigações — prazos gerados a partir da periodicidade do órgão."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {colunas.map((coluna) => (
          <div key={coluna.titulo} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <span className={cn('h-2.5 w-2.5 rounded-full', coluna.cor)} />
              <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200">{coluna.titulo}</h2>
              <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                {coluna.tarefas.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {coluna.tarefas.map((t) => (
                <Card key={t.titulo} className="cursor-pointer p-4 transition-shadow hover:shadow-pop">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{t.titulo}</p>
                    <Badge tone={prioridadeTone[t.prioridade]}>{t.prioridade}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-400">{t.ajuste}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-500 dark:text-ink-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Prazo legal: {t.prazo}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

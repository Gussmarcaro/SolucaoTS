import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} subtitle="Módulo em construção." />
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <Construction className="h-7 w-7" />
        </span>
        <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
          Esta tela será construída nas próximas fases do projeto.
        </p>
        <p className="max-w-sm text-xs text-ink-400">
          Consulte o PLANO_ACAO.md para ver em qual fase este módulo entra.
        </p>
      </Card>
    </>
  );
}

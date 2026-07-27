import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' };
  tone?: 'brand' | 'emerald' | 'amber' | 'red';
}

const tones = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
};

export function StatCard({ label, value, icon: Icon, hint, trend, tone = 'brand' }: StatCardProps) {
  const up = trend?.direction === 'up';
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">{value}</p>
        <p className="mt-1 text-sm font-medium text-ink-500 dark:text-ink-400">{label}</p>
        {hint && <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
      </div>
    </Card>
  );
}

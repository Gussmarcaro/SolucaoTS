import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  /** Já formatado; `null` enquanto carrega. */
  valor: string | null;
  icone: LucideIcon;
  /** Linha de apoio no rodapé. */
  rodape?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Cartão de indicador: rótulo e ícone no topo, número grande no corpo colorido e
 * uma faixa de apoio no rodapé.
 *
 * O corpo usa exatamente o tratamento da barra lateral — gradiente do azul da
 * marca no tema claro, grafite no escuro —, então os dois elementos coloridos da
 * tela combinam em vez de disputar atenção.
 *
 * O número usa os algarismos proporcionais da fonte: `tabular-nums` daria a todos
 * a largura do zero e afrouxaria o texto neste tamanho. Alinhamento vertical de
 * dígitos só importa em colunas de tabela.
 */
export function KpiTile({ label, valor, icone: Icone, rodape, onClick }: Props) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={cn(
        'group overflow-hidden rounded-2xl shadow-card transition-all',
        'dark:border dark:border-ink-800/70',
        onClick && 'focus-ring cursor-pointer hover:-translate-y-0.5 hover:shadow-pop',
      )}
    >
      <div
        className={cn(
          'bg-gradient-to-b from-brand-500 to-brand-700 px-4 pb-5 pt-4 text-white',
          'dark:bg-none dark:bg-ink-900 dark:text-ink-100',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{label}</p>
          <Icone className="h-5 w-5 shrink-0 text-white/80 dark:text-ink-400" />
        </div>
        {valor === null ? (
          <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-white/25 dark:bg-ink-800" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight">{valor}</p>
        )}
      </div>

      {/* No escuro o corpo também é grafite, então a faixa precisa de um traço
          para não colar no número. */}
      <div className="flex min-h-[2.75rem] items-center gap-1.5 bg-white px-4 py-2.5 text-xs text-ink-500 dark:border-t dark:border-ink-800/70 dark:bg-ink-900 dark:text-ink-400">
        {rodape ?? <span className="text-ink-400">—</span>}
      </div>
    </div>
  );
}

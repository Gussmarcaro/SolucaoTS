import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Paleta dos cartões — validada com o script do guia de visualização
 * (`validate_palette.js`, modos claro e escuro): faixa de luminosidade, piso de
 * croma, separação para daltonismo e contraste contra a superfície.
 *
 * São os passos **700** das rampas, e não os 600: o texto branco sobre o 600 fica
 * em 3,2:1 no âmbar e 3,7:1 no verde, abaixo dos 4,5:1 que um rótulo em corpo
 * pequeno exige. Nos 700 o pior caso é 5,0:1.
 *
 * A ordem importa — o validador mede pares vizinhos, e é nela que âmbar e verde
 * ficam separados de rosa e violeta.
 */
export const CORES_KPI = [
  '#2c5f9a', // brand 700
  '#b45309', // amber 700
  '#047857', // emerald 700
  '#6d28d9', // violet 700
  '#be123c', // rose 700
  '#a21caf', // fuchsia 700
] as const;

interface Props {
  label: string;
  /** Já formatado; `null` enquanto carrega. */
  valor: string | null;
  icone: LucideIcon;
  /** Índice na paleta — mantém a cor colada ao cadastro, não à posição na tela. */
  cor: number;
  /** Linha de apoio no rodapé. */
  rodape?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Cartão de indicador: rótulo e ícone no topo, número grande no corpo colorido e
 * uma faixa de apoio no rodapé.
 *
 * O número usa os algarismos proporcionais da fonte — `tabular-nums` daria a
 * todos a largura do zero e afrouxaria o texto neste tamanho; alinhamento
 * vertical só importa em colunas de tabela.
 */
export function KpiTile({ label, valor, icone: Icone, cor, rodape, onClick }: Props) {
  const fundo = CORES_KPI[cor % CORES_KPI.length];

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={cn(
        'group overflow-hidden rounded-2xl shadow-card transition-all',
        onClick && 'focus-ring cursor-pointer hover:-translate-y-0.5 hover:shadow-pop',
      )}
    >
      <div className="px-4 pb-5 pt-4 text-white" style={{ backgroundColor: fundo }}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{label}</p>
          <Icone className="h-5 w-5 shrink-0 text-white/80" />
        </div>
        {valor === null ? (
          <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-white/25" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight">{valor}</p>
        )}
      </div>

      <div className="flex min-h-[2.75rem] items-center gap-1.5 bg-white px-4 py-2.5 text-xs text-ink-500 dark:bg-ink-900 dark:text-ink-400">
        {rodape ?? <span className="text-ink-400">—</span>}
      </div>
    </div>
  );
}

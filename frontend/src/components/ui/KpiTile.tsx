import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Rampa azul dos cartões — seis passos do azul da marca ao azul-marinho,
 * interpolados em **OKLab** para o espaçamento ser perceptualmente uniforme (em
 * RGB os tons do meio ficariam amontoados).
 *
 * É uma rampa **sequencial**, não uma paleta categórica: quem identifica o
 * cadastro é o rótulo e o ícone, não a cor. Por isso a verificação que vale aqui
 * é outra — luminosidade monotônica e contraste do texto, não separação de
 * matizes para daltonismo.
 *
 * Ambas conferidas: L(OKLab) cai 0,554 → 0,282 em passos de ~0,054, e o texto
 * branco fica entre 4,8:1 e 14,7:1. O primeiro passo é o teto de claridade
 * possível — o azul da marca (#4a90d9) daria só 3,3:1 com texto branco, abaixo
 * dos 4,5:1 exigidos para corpo pequeno.
 */
export const CORES_KPI = [
  '#3574bd',
  '#2f63a7',
  '#295391',
  '#23437c',
  '#1d3468',
  '#172554',
] as const;

interface Props {
  label: string;
  /** Já formatado; `null` enquanto carrega. */
  valor: string | null;
  icone: LucideIcon;
  /** Passo da rampa; segue a ordem dos cartões na tela. */
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

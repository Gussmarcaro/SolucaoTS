import { Building2, ChevronDown } from 'lucide-react';
import { useAjusteExecucao } from '@/contexts/AjusteExecucaoContext';

/**
 * O ajuste em execução, sempre à vista.
 *
 * Mesma razão do seletor de órgão do suporte, e o mesmo risco: **lançamento no
 * ajuste errado é indistinguível de lançamento certo** até alguém conferir nota
 * por nota. Quem trabalha em duas parcerias no mesmo dia precisa saber em qual
 * está *antes* de digitar, não depois.
 *
 * Por isso a faixa fica no topo da tela, não escondida num menu, e a troca é um
 * clique — dificultar a troca empurraria a pessoa a lançar no ajuste aberto.
 */
export function FaixaAjuste() {
  const { ajuste, ajustes, escolher } = useAjusteExecucao();
  if (!ajuste) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
      <Building2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
      <span className="text-xs uppercase tracking-wide text-brand-700/70 dark:text-brand-300/70">
        Executando
      </span>

      <div className="relative min-w-0 flex-1">
        {/* Um `select` nativo por cima do rótulo: a troca é frequente o
            bastante para não valer um modal, e o nativo resolve teclado e
            toque sem código. */}
        <select
          value={ajuste.id}
          onChange={(e) => escolher(e.target.value)}
          aria-label="Ajuste em execução"
          className="focus-ring absolute inset-0 w-full cursor-pointer opacity-0"
        >
          {ajustes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero ? `${a.numero} — ` : ''}
              {a.entidadeNome}
            </option>
          ))}
        </select>
        <span className="pointer-events-none flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
            {ajuste.numero ? `${ajuste.numero} — ` : ''}
            {ajuste.entidadeNome}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
        </span>
      </div>

      <span className="hidden shrink-0 font-mono text-xs text-ink-400 sm:inline">
        {ajuste.codigoAjuste}
      </span>
    </div>
  );
}

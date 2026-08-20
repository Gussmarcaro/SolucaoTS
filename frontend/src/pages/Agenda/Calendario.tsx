import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { TIPO_COR, TIPO_LABEL, horaBr, type Compromisso } from '@/types/compromisso';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface Props {
  mes: Date;
  onMes: (d: Date) => void;
  compromissos: Compromisso[];
  onAbrir: (c: Compromisso) => void;
  /** Clique numa célula vazia — agendar naquele dia. */
  onDia: (dia: Date) => void;
}

/** Chave local 'YYYY-MM-DD' — sem passar por UTC, que desloca o dia. */
const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Mês na tela — é o que faz uma lista de compromissos virar agenda.
 *
 * A grade sempre mostra 6 semanas, mesmo que o mês caiba em 5: com o número de
 * linhas variando, a tela pula de altura ao trocar de mês e o olho perde a
 * referência de onde estava.
 */
export function Calendario({ mes, onMes, compromissos, onAbrir, onDia }: Props) {
  const hoje = chaveDia(new Date());

  const semanas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    // Recua até o domingo da semana do dia 1.
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());

    return Array.from({ length: 6 }, (_, semana) =>
      Array.from({ length: 7 }, (_, dia) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + semana * 7 + dia);
        return d;
      }),
    );
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Compromisso[]>();
    for (const c of compromissos) {
      const k = chaveDia(new Date(c.inicioEm));
      (mapa.get(k) ?? mapa.set(k, []).get(k)!).push(c);
    }
    for (const lista of mapa.values())
      lista.sort((a, b) => a.inicioEm.localeCompare(b.inicioEm));
    return mapa;
  }, [compromissos]);

  const trocar = (delta: number) => onMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-sm font-semibold capitalize text-ink-800 dark:text-ink-100">
          {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => trocar(-1)} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onMes(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          >
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={() => trocar(1)} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-ink-100 text-center text-[11px] font-medium uppercase tracking-wide text-ink-400 dark:border-ink-800">
        {DIAS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {semanas.flat().map((d) => {
          const k = chaveDia(d);
          const doMes = d.getMonth() === mes.getMonth();
          const itens = porDia.get(k) ?? [];
          return (
            <div
              key={k}
              onClick={() => onDia(d)}
              className={cn(
                'min-h-[92px] cursor-pointer border-b border-r border-ink-100 p-1.5 transition-colors',
                'hover:bg-ink-50/70 dark:border-ink-800 dark:hover:bg-ink-800/40',
                // Dia de fora do mês fica apagado em vez de sumir: a semana
                // continua legível e o mês não parece começar torto.
                !doMes && 'bg-ink-50/40 dark:bg-ink-950/30',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                  k === hoje
                    ? 'bg-brand-500 font-semibold text-white'
                    : doMes
                      ? 'text-ink-600 dark:text-ink-300'
                      : 'text-ink-300 dark:text-ink-600',
                )}
              >
                {d.getDate()}
              </span>

              <div className="mt-1 space-y-0.5">
                {itens.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`${horaBr(c.inicioEm)} · ${TIPO_LABEL[c.tipo]} — ${c.titulo}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrir(c);
                    }}
                    className={cn(
                      'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10.5px]',
                      'hover:bg-ink-100 dark:hover:bg-ink-800',
                      c.status === 'CANCELADO' && 'line-through opacity-50',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TIPO_COR[c.tipo])} />
                    <span className="shrink-0 tabular-nums text-ink-400">{horaBr(c.inicioEm)}</span>
                    <span className="truncate text-ink-700 dark:text-ink-200">{c.titulo}</span>
                  </button>
                ))}
                {itens.length > 3 && (
                  <p className="px-1 text-[10px] text-ink-400">+{itens.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

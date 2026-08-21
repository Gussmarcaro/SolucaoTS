import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  TIPO_LABEL,
  classeDaCor,
  classeDeFundo,
  deslocar,
  horaBr,
  podeArrastar,
  type Compromisso,
} from '@/types/compromisso';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface Props {
  mes: Date;
  onMes: (d: Date) => void;
  compromissos: Compromisso[];
  onAbrir: (c: Compromisso) => void;
  /** Clique numa célula vazia — agendar naquele dia. */
  onDia: (dia: Date) => void;
  /**
   * Remarcar arrastando de um dia para outro. Ausente = grade só de leitura
   * (sem permissão de edição), e aí nada se move.
   */
  onMover?: (c: Compromisso, inicioEm: Date, fimEm: Date | null) => void;
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
 *
 * ## Arrastar para outro dia
 *
 * Aqui o alvo é uma **célula**, não um instante — e para isso o arrasto nativo
 * do HTML basta e sai de graça: teclado, toque e cursor já vêm resolvidos pelo
 * navegador. A hora do compromisso é preservada; o mês não mostra horário
 * suficiente para remarcá-lo, e mudar a hora sem que ninguém peça seria pior
 * que não mover. Para mexer no horário existem as vistas de dia e semana.
 */
export function Calendario({ mes, onMes, compromissos, onAbrir, onDia, onMover }: Props) {
  const hoje = chaveDia(new Date());
  /** Célula sob o cursor durante o arrasto — o realce que diz onde vai cair. */
  const [alvo, setAlvo] = useState<string | null>(null);
  const [arrastado, setArrastado] = useState<Compromisso | null>(null);

  const arrastavel = (c: Compromisso) => !!onMover && podeArrastar(c) && !c.ocorrencia;

  /** Dias inteiros entre duas datas, ignorando a hora. */
  function diasEntre(de: Date, ate: Date): number {
    const a = new Date(de.getFullYear(), de.getMonth(), de.getDate());
    const b = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate());
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
  }

  function soltarEm(dia: Date) {
    const c = arrastado;
    setArrastado(null);
    setAlvo(null);
    if (!c) return;
    const dias = diasEntre(new Date(c.inicioEm), dia);
    if (dias === 0) return;
    const { inicioEm, fimEm } = deslocar(c, { dias });
    onMover?.(c, inicioEm, c.diaInteiro ? null : fimEm);
  }

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
        <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
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
              onDragOver={(e) => {
                if (!arrastado) return;
                // Sem o preventDefault o navegador recusa a soltura — é assim
                // que se declara uma célula como alvo válido.
                e.preventDefault();
                setAlvo(k);
              }}
              onDragLeave={() => setAlvo((a) => (a === k ? null : a))}
              onDrop={(e) => {
                e.preventDefault();
                soltarEm(d);
              }}
              className={cn(
                'min-h-[92px] cursor-pointer border-b border-r border-ink-100 p-1.5 transition-colors',
                'hover:bg-ink-50/70 dark:border-ink-800 dark:hover:bg-ink-800/40',
                // Dia de fora do mês fica apagado em vez de sumir: a semana
                // continua legível e o mês não parece começar torto.
                !doMes && 'bg-ink-50/40 dark:bg-ink-950/30',
                alvo === k && 'bg-brand-50 ring-2 ring-inset ring-brand-400 dark:bg-brand-500/10',
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
                    draggable={arrastavel(c)}
                    onDragStart={(e) => {
                      setArrastado(c);
                      e.dataTransfer.effectAllowed = 'move';
                      // Alguns navegadores cancelam o arrasto sem carga útil.
                      e.dataTransfer.setData('text/plain', c.id);
                    }}
                    onDragEnd={() => {
                      setArrastado(null);
                      setAlvo(null);
                    }}
                    title={
                      `${horaBr(c.inicioEm)} · ${TIPO_LABEL[c.tipo]} — ${c.titulo}` +
                      (arrastavel(c) ? '\nArraste para outro dia; a hora é preservada.' : '')
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrir(c);
                    }}
                    className={cn(
                      'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10.5px]',
                      'transition-colors',
                      // A cor escolhida em marca d'água: a bolinha identifica,
                      // a lavagem faz o olho agrupar sem comparar pontos de 6px.
                      //
                      // Cancelado fica de fora: manter a cor daria à linha
                      // riscada o mesmo peso visual das que ainda valem.
                      c.status === 'CANCELADO'
                        ? 'line-through opacity-50 hover:bg-ink-100 dark:hover:bg-ink-800'
                        : classeDeFundo(c),
                      arrastavel(c) && 'cursor-grab active:cursor-grabbing',
                      arrastado?.id === c.id && 'opacity-40',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', classeDaCor(c))} />
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

      {onMover && (
        <p className="border-t border-ink-100 px-4 py-2 text-[11px] text-ink-400 dark:border-ink-800">
          Arraste um compromisso para outro dia — a hora é preservada. Para mudar o horário, use as
          vistas de dia ou semana. Séries que se repetem, realizados e cancelados não se movem.
        </p>
      )}
    </div>
  );
}

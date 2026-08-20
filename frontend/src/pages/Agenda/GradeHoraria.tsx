import { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { TIPO_LABEL, classeDaCor, horaBr, type Compromisso } from '@/types/compromisso';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** Altura de uma hora, em pixels — é o que converte horário em posição. */
const ALTURA_HORA = 44;

interface Props {
  /** `1` = dia, `7` = semana. */
  dias: 1 | 7;
  /** Primeiro dia exibido. */
  inicio: Date;
  onInicio: (d: Date) => void;
  compromissos: Compromisso[];
  onAbrir: (c: Compromisso) => void;
  /** Clique num horário vazio — agendar ali. */
  onHorario: (quando: Date) => void;
}

const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Minutos desde a meia-noite — a coordenada vertical de tudo aqui. */
function minutosDoDia(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Grade horária — as vistas de **dia** e **semana**.
 *
 * As duas são a mesma grade com largura diferente: um dia ou sete. Separar em
 * dois componentes duplicaria o posicionamento por horário, que é a única parte
 * difícil — e é onde um erro aparece como reunião no lugar errado do dia.
 *
 * Compromissos de **dia inteiro** ficam numa faixa acima da grade, e não
 * ocupando 24 horas de altura: eles não têm hora, e desenhá-los como um bloco
 * gigante esconderia tudo que acontece naquele dia.
 */
export function GradeHoraria({ dias, inicio, onInicio, compromissos, onAbrir, onHorario }: Props) {
  const rolagem = useRef<HTMLDivElement>(null);

  const colunas = useMemo(() => {
    const base = new Date(inicio);
    if (dias === 7) base.setDate(base.getDate() - base.getDay()); // domingo
    return Array.from({ length: dias }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [dias, inicio]);

  // Abre rolado até as 7h: o expediente começa aí, e mostrar a madrugada
  // primeiro faria a tela parecer vazia toda vez.
  useEffect(() => {
    if (rolagem.current) rolagem.current.scrollTop = 7 * ALTURA_HORA;
  }, [dias]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, { comHora: Compromisso[]; diaInteiro: Compromisso[] }>();
    for (const c of compromissos) {
      const k = chaveDia(new Date(c.inicioEm));
      const atual = mapa.get(k) ?? { comHora: [], diaInteiro: [] };
      (c.diaInteiro ? atual.diaInteiro : atual.comHora).push(c);
      mapa.set(k, atual);
    }
    return mapa;
  }, [compromissos]);

  const hoje = chaveDia(new Date());

  function mover(passo: number) {
    const d = new Date(colunas[0]);
    d.setDate(d.getDate() + passo * dias);
    onInicio(d);
  }

  const titulo =
    dias === 1
      ? colunas[0].toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      : `${colunas[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${colunas[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-sm font-semibold capitalize text-ink-800 dark:text-ink-100">{titulo}</p>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => mover(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onInicio(new Date())}>
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={() => mover(1)} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cabeçalho dos dias — fica fora da área rolável para não sumir. */}
      <div className="flex border-b border-ink-100 dark:border-ink-800">
        <div className="w-14 shrink-0" />
        {colunas.map((d) => {
          const k = chaveDia(d);
          return (
            <div key={k} className="flex-1 border-l border-ink-100 py-1.5 text-center dark:border-ink-800">
              <p className="text-[11px] uppercase tracking-wide text-ink-400">
                {DIAS_CURTOS[d.getDay()]}
              </p>
              <p
                className={cn(
                  'mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  k === hoje ? 'bg-brand-500 font-semibold text-white' : 'text-ink-700 dark:text-ink-200',
                )}
              >
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Faixa de dia inteiro, só quando há algo — senão rouba altura à toa. */}
      {colunas.some((d) => (porDia.get(chaveDia(d))?.diaInteiro.length ?? 0) > 0) && (
        <div className="flex border-b border-ink-100 dark:border-ink-800">
          <div className="w-14 shrink-0 py-1 pr-2 text-right text-[10px] text-ink-400">dia todo</div>
          {colunas.map((d) => (
            <div key={chaveDia(d)} className="flex-1 space-y-0.5 border-l border-ink-100 p-1 dark:border-ink-800">
              {(porDia.get(chaveDia(d))?.diaInteiro ?? []).map((c) => (
                <button
                  key={c.id + c.inicioEm}
                  type="button"
                  onClick={() => onAbrir(c)}
                  className={cn(
                    'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10.5px] text-white',
                    classeDaCor(c),
                    c.status === 'CANCELADO' && 'line-through opacity-60',
                  )}
                >
                  <span className="truncate">{c.titulo}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={rolagem} className="max-h-[60vh] overflow-y-auto">
        <div className="flex">
          {/* Régua das horas */}
          <div className="w-14 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                style={{ height: ALTURA_HORA }}
                className="relative pr-2 text-right text-[10px] text-ink-400"
              >
                <span className="absolute right-2 -top-1.5">{h > 0 ? `${h}:00` : ''}</span>
              </div>
            ))}
          </div>

          {colunas.map((d) => {
            const k = chaveDia(d);
            const itens = porDia.get(k)?.comHora ?? [];
            return (
              <div key={k} className="relative flex-1 border-l border-ink-100 dark:border-ink-800">
                {/* Faixas de hora: clicar agenda naquele horário. */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    style={{ height: ALTURA_HORA }}
                    onClick={() => {
                      const quando = new Date(d);
                      quando.setHours(h, 0, 0, 0);
                      onHorario(quando);
                    }}
                    className="cursor-pointer border-b border-ink-100/70 transition-colors hover:bg-brand-50/60 dark:border-ink-800/60 dark:hover:bg-brand-500/5"
                  />
                ))}

                {itens.map((c) => {
                  const topo = (minutosDoDia(c.inicioEm) / 60) * ALTURA_HORA;
                  const duracao = Math.max(
                    20,
                    ((new Date(c.fimEm).getTime() - new Date(c.inicioEm).getTime()) / 3_600_000) *
                      ALTURA_HORA,
                  );
                  return (
                    <button
                      key={c.id + c.inicioEm}
                      type="button"
                      onClick={() => onAbrir(c)}
                      title={`${horaBr(c.inicioEm)}–${horaBr(c.fimEm)} · ${TIPO_LABEL[c.tipo]} — ${c.titulo}`}
                      style={{ top: topo, height: duracao }}
                      className={cn(
                        'absolute inset-x-0.5 overflow-hidden rounded px-1.5 py-0.5 text-left text-[10.5px] text-white shadow-sm',
                        classeDaCor(c),
                        c.status === 'CANCELADO' && 'line-through opacity-60',
                      )}
                    >
                      <span className="block truncate font-medium">{c.titulo}</span>
                      {duracao > 34 && (
                        <span className="block truncate opacity-90">
                          {horaBr(c.inicioEm)}–{horaBr(c.fimEm)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

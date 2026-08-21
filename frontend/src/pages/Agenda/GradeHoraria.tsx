import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  TIPO_LABEL,
  classeDaCor,
  deslocar,
  horaBr,
  podeArrastar,
  PASSO_ARRASTO,
  type Compromisso,
} from '@/types/compromisso';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** Altura de uma hora, em pixels — é o que converte horário em posição. */
const ALTURA_HORA = 44;
/** Largura da régua das horas (`w-14`) — o zero do eixo dos dias. */
const LARGURA_REGUA = 56;
/** Movimento abaixo disso é tremor de mão, não arrasto: continua sendo clique. */
const TOLERANCIA_PX = 4;

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
  /**
   * Remarcar arrastando. Ausente = grade só de leitura (sem permissão de
   * edição), e aí nada se move.
   */
  onMover?: (c: Compromisso, inicioEm: Date, fimEm: Date | null) => void;
}

const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Minutos desde a meia-noite — a coordenada vertical de tudo aqui. */
function minutosDoDia(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Arrasto em curso. `moveu` é o que separa remarcar de simplesmente clicar. */
interface Arrasto {
  c: Compromisso;
  modo: 'mover' | 'redimensionar';
  /** Só o eixo dos dias — compromisso de dia inteiro não tem hora para mexer. */
  soDias: boolean;
  x0: number;
  y0: number;
  colunaInicial: number;
  dias: number;
  minutos: number;
  moveu: boolean;
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
 *
 * ## Arrastar para remarcar
 *
 * O bloco se move com o ponteiro e a grade mostra **onde ele vai cair** antes
 * de soltar: remarcar às cegas, com o resultado aparecendo só depois de gravar,
 * seria pior que abrir o formulário. A gravação só acontece no soltar, e só se
 * o horário realmente mudou — senão o gesto continua sendo um clique, que abre
 * o compromisso.
 *
 * Usa eventos de ponteiro, não o *drag and drop* do HTML: aqui o alvo não é uma
 * célula, é um instante — e é preciso converter pixel em minuto, prender ao
 * passo de 15 e desenhar a prévia enquanto o dedo ainda está na tela.
 */
export function GradeHoraria({
  dias,
  inicio,
  onInicio,
  compromissos,
  onAbrir,
  onHorario,
  onMover,
}: Props) {
  const rolagem = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLDivElement>(null);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  /** Espelho do arrasto para os ouvintes da janela — ver o efeito abaixo. */
  const arrastoRef = useRef<Arrasto | null>(null);
  arrastoRef.current = arrasto;
  /** Evita que o soltar do arrasto vire clique na faixa de hora embaixo. */
  const acabouDeArrastar = useRef(false);

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

  const arrastavel = (c: Compromisso) => !!onMover && podeArrastar(c) && !c.ocorrencia;

  /** Índice da coluna sob o ponteiro; fora da grade, a mais próxima. */
  const colunaEm = useCallback(
    (clientX: number): number => {
      const r = grade.current?.getBoundingClientRect();
      if (!r) return 0;
      const largura = (r.width - LARGURA_REGUA) / dias;
      const i = Math.floor((clientX - r.left - LARGURA_REGUA) / Math.max(1, largura));
      return Math.min(dias - 1, Math.max(0, i));
    },
    [dias],
  );

  function iniciar(
    e: React.PointerEvent,
    c: Compromisso,
    coluna: number,
    modo: Arrasto['modo'],
    soDias = false,
  ) {
    if (!arrastavel(c)) return;
    e.stopPropagation();
    e.preventDefault();
    setArrasto({
      c,
      modo,
      soDias,
      x0: e.clientX,
      y0: e.clientY,
      colunaInicial: coluna,
      dias: 0,
      minutos: 0,
      moveu: false,
    });
  }

  // Os ouvintes ficam na janela, não no bloco: o ponteiro sai dele já no
  // primeiro pixel de movimento, e um arrasto que solta fora da grade precisa
  // terminar do mesmo jeito — senão o bloco fica preso ao cursor.
  //
  // Registrados uma vez por arrasto, não a cada pixel: por isso o soltar lê o
  // estado pelo ref, e não pela closure do efeito, que ficaria velha.
  const arrastando = arrasto !== null;
  useEffect(() => {
    if (!arrastando) return;

    function mover(e: PointerEvent) {
      setArrasto((a) => {
        if (!a) return a;
        const dx = e.clientX - a.x0;
        const dy = e.clientY - a.y0;
        const passos = Math.round(dy / ALTURA_HORA / (PASSO_ARRASTO / 60));
        const minutos = a.soDias ? 0 : passos * PASSO_ARRASTO;
        // Redimensionar mexe só no fim: mudar de coluna não faz sentido.
        const novosDias = a.modo === 'redimensionar' ? 0 : colunaEm(e.clientX) - a.colunaInicial;
        const moveu =
          a.moveu ||
          Math.abs(dx) > TOLERANCIA_PX ||
          Math.abs(dy) > TOLERANCIA_PX ||
          novosDias !== 0;
        if (novosDias === a.dias && minutos === a.minutos && moveu === a.moveu) return a;
        return { ...a, dias: novosDias, minutos, moveu };
      });
    }

    function soltar() {
      const a = arrastoRef.current;
      setArrasto(null);
      if (!a) return;

      // Gesto que não moveu nada continua sendo um clique: abre o compromisso.
      if (!a.moveu) {
        onAbrir(a.c);
        return;
      }
      // Moveu e voltou ao lugar: nada a gravar, e também não é clique.
      acabouDeArrastar.current = true;
      // Volta ao normal no próximo ciclo — o clique que o navegador sintetiza
      // depois do soltar chega antes disso.
      setTimeout(() => (acabouDeArrastar.current = false), 0);
      if (a.dias === 0 && a.minutos === 0) return;

      const { inicioEm, fimEm } = deslocar(a.c, {
        dias: a.dias,
        minutos: a.minutos,
        so: a.modo === 'redimensionar' ? 'fim' : 'ambos',
      });
      onMover?.(a.c, inicioEm, a.c.diaInteiro ? null : fimEm);
    }

    function cancelar(e: KeyboardEvent) {
      if (e.key === 'Escape') setArrasto(null);
    }

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('keydown', cancelar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      window.removeEventListener('keydown', cancelar);
    };
  }, [arrastando, colunaEm, onAbrir, onMover]);

  // Prévia: enquanto arrasta, o compromisso é exibido já no destino. Sem isso o
  // usuário solta no escuro e descobre onde caiu depois de gravar.
  const exibidos = useMemo(() => {
    if (!arrasto?.moveu) return compromissos;
    return compromissos.map((c) => {
      if (c.id !== arrasto.c.id || c.inicioEm !== arrasto.c.inicioEm) return c;
      const { inicioEm, fimEm } = deslocar(c, {
        dias: arrasto.dias,
        minutos: arrasto.minutos,
        so: arrasto.modo === 'redimensionar' ? 'fim' : 'ambos',
      });
      return { ...c, inicioEm: inicioEm.toISOString(), fimEm: fimEm.toISOString() };
    });
  }, [compromissos, arrasto]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, { comHora: Compromisso[]; diaInteiro: Compromisso[] }>();
    for (const c of exibidos) {
      const k = chaveDia(new Date(c.inicioEm));
      const atual = mapa.get(k) ?? { comHora: [], diaInteiro: [] };
      (c.diaInteiro ? atual.diaInteiro : atual.comHora).push(c);
      mapa.set(k, atual);
    }
    return mapa;
  }, [exibidos]);

  const hoje = chaveDia(new Date());
  const emArrasto = (c: Compromisso) => arrasto?.moveu && arrasto.c.id === c.id;

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
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900',
        // Durante o arrasto, o cursor de agarrar vale na tela inteira e a
        // seleção de texto fica desligada — senão a página inteira fica azul.
        arrasto && 'cursor-grabbing select-none',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{titulo}</p>
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
          {colunas.map((d, coluna) => (
            <div key={chaveDia(d)} className="flex-1 space-y-0.5 border-l border-ink-100 p-1 dark:border-ink-800">
              {(porDia.get(chaveDia(d))?.diaInteiro ?? []).map((c) => (
                <button
                  key={c.id + c.inicioEm}
                  type="button"
                  onPointerDown={(e) => iniciar(e, c, coluna, 'mover', true)}
                  onClick={() => !arrastavel(c) && onAbrir(c)}
                  className={cn(
                    'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10.5px] text-white',
                    classeDaCor(c),
                    arrastavel(c) ? 'cursor-grab touch-none' : 'cursor-pointer',
                    c.status === 'CANCELADO' && 'line-through opacity-60',
                    emArrasto(c) && 'ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-ink-900',
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
        <div ref={grade} className="flex">
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

          {colunas.map((d, coluna) => {
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
                      if (acabouDeArrastar.current) return;
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
                  const podeMover = arrastavel(c);
                  return (
                    <div
                      key={c.id + c.inicioEm}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(e) => iniciar(e, c, coluna, 'mover')}
                      onClick={() => !podeMover && onAbrir(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onAbrir(c);
                        }
                      }}
                      title={
                        `${horaBr(c.inicioEm)}–${horaBr(c.fimEm)} · ${TIPO_LABEL[c.tipo]} — ${c.titulo}` +
                        (podeMover ? '\nArraste para remarcar; a borda de baixo muda a duração.' : '')
                      }
                      style={{ top: topo, height: duracao }}
                      className={cn(
                        'absolute inset-x-0.5 overflow-hidden rounded px-1.5 py-0.5 text-left text-[10.5px] text-white shadow-sm',
                        classeDaCor(c),
                        podeMover ? 'cursor-grab touch-none' : 'cursor-pointer',
                        c.status === 'CANCELADO' && 'line-through opacity-60',
                        emArrasto(c) &&
                          'z-10 cursor-grabbing shadow-lg ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-ink-900',
                      )}
                    >
                      <span className="block truncate font-medium">{c.titulo}</span>
                      {duracao > 34 && (
                        <span className="block truncate opacity-90">
                          {horaBr(c.inicioEm)}–{horaBr(c.fimEm)}
                        </span>
                      )}

                      {/* Pegador de duração: só o fim se move, e por isso ele
                          fica na borda de baixo — é onde a mão vai procurar. */}
                      {podeMover && (
                        <span
                          onPointerDown={(e) => iniciar(e, c, coluna, 'redimensionar')}
                          title="Arraste para mudar a duração"
                          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none bg-white/25 opacity-0 transition-opacity hover:opacity-100"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {onMover && (
        <p className="border-t border-ink-100 px-4 py-2 text-[11px] text-ink-400 dark:border-ink-800">
          Arraste um compromisso para remarcá-lo — de hora e de dia. A borda de baixo muda a
          duração; <kbd className="rounded border border-ink-200 px-1 dark:border-ink-700">Esc</kbd>{' '}
          desiste. Séries que se repetem, realizados e cancelados não se movem.
        </p>
      )}
    </div>
  );
}

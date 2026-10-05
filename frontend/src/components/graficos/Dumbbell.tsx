import type { ReactNode } from 'react';
import { Dica, useDica } from './base';

export interface ParItem {
  id: string;
  rotulo: string;
  sub?: string;
  /** Posição do "antes" no eixo, de 0 a 1. */
  de: number;
  /** Posição do "depois". `null` quando ainda não aconteceu. */
  para: number | null;
  /** Marca o par como fora do aceitável — veste cor de **estado**, não de série. */
  alerta?: boolean;
  anotacao: string;
  dica?: ReactNode;
}

/**
 * Dumbbell — **antes → depois** por item.
 *
 * É a forma certa para "previsto × realizado", e não duas barras lado a lado: o
 * que o leitor precisa medir é a **distância** entre os dois pontos, e um par de
 * barras obriga a comparar dois comprimentos a partir de uma origem comum, que é
 * a pergunta errada. Aqui o atraso é literalmente o comprimento do traço.
 *
 * Os dois pontos são tons do **mesmo matiz** (previsto claro, realizado escuro):
 * não são duas identidades, são dois momentos de uma coisa só.
 *
 * O traço veste cor de **estado** quando o atraso passa do aceitável. É a
 * exceção legítima à regra de não misturar escalas: aqui a série *significa*
 * bom/ruim, e o ponto que não foi repassado não é "a série 2".
 */
export function Dumbbell({ itens, eixo }: { itens: ParItem[]; eixo?: ReactNode }) {
  const { dica, aoMover, aoSair } = useDica();
  const pct = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`;

  return (
    <>
      <ul className="space-y-3">
        {itens.map((i) => {
          const fim = i.para ?? i.de;
          const esq = Math.min(i.de, fim);
          const dir = Math.max(i.de, fim);

          return (
            <li key={i.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-xs text-ink-700 dark:text-ink-200">
                  {i.rotulo}
                  {i.sub && <span className="ml-1.5 text-ink-400">{i.sub}</span>}
                </p>
                <p
                  className={`shrink-0 text-[11px] tabular-nums ${
                    i.alerta
                      ? 'font-medium text-red-600 dark:text-red-400'
                      : 'text-ink-500 dark:text-ink-400'
                  }`}
                >
                  {i.anotacao}
                </p>
              </div>

              <div
                className="relative mt-1.5 h-3 cursor-default"
                onMouseMove={(e) => i.dica && aoMover(e, i.dica)}
                onMouseLeave={aoSair}
              >
                {/* Trilho — um passo fora da superfície, recessivo. Ele é o
                    eixo; sem ele os pontos flutuariam sem referência. */}
                <div
                  className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
                  style={{ background: 'var(--g-grade)' }}
                />

                {/* O traço entre os dois momentos: é ele que mede o atraso. */}
                {i.para !== null && (
                  <div
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                    style={{
                      left: pct(esq),
                      width: pct(dir - esq),
                      background: i.alerta ? 'var(--g-rejeitado)' : 'var(--g-previsto)',
                    }}
                  />
                )}

                <Ponto posicao={pct(i.de)} cor="var(--g-previsto)" />
                {i.para !== null && <Ponto posicao={pct(i.para)} cor="var(--g-realizado)" />}
              </div>
            </li>
          );
        })}
      </ul>

      {eixo && (
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-ink-400">{eixo}</div>
      )}
      <Dica dica={dica} />
    </>
  );
}

/**
 * Ponto do dumbbell.
 *
 * O anel de 2px **na cor da superfície** é o que mantém os dois pontos legíveis
 * quando o atraso é curto e eles quase se encostam. Contorno colorido somaria
 * tinta que não é dado; o anel é o vazio fazendo a separação.
 */
function Ponto({ posicao, cor }: { posicao: string; cor: string }) {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ left: posicao, background: cor, boxShadow: '0 0 0 2px var(--g-superficie)' }}
    />
  );
}

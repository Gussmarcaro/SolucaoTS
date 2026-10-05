import type { ReactNode } from 'react';
import { Dica, useDica } from './base';

export interface BarraItem {
  id: string;
  rotulo: string;
  sub?: string;
  valor: number;
  /** Texto à direita da barra — o valor já formatado como a tela quer. */
  anotacao: string;
  /** `false` empurra a barra para o cinza de segundo plano. */
  destaque: boolean;
  dica?: ReactNode;
}

/**
 * Barras horizontais com **ênfase** — um matiz para o que é o assunto, cinza
 * para o contexto.
 *
 * É a forma mais subusada do repertório, e a resposta honesta a "deixa esse
 * gráfico mais claro". Aqui ela responde à concentração de fornecedores: os
 * credores que formam os 80% da despesa saem coloridos, a cauda sai apagada.
 *
 * **As barras não são coloridas por valor.** Todas as destacadas usam o mesmo
 * tom: pintar cada uma de uma cor gastaria o canal de identidade repetindo o
 * que o comprimento da barra já diz — e sobrariam oito cores para dizer nada.
 */
export function BarrasEnfase({ itens, alturaBarra = 12 }: { itens: BarraItem[]; alturaBarra?: number }) {
  const { dica, aoMover, aoSair } = useDica();
  const maior = Math.max(1, ...itens.map((i) => i.valor));

  return (
    <>
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.id} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-ink-700 dark:text-ink-200">
                {i.rotulo}
                {i.sub && <span className="ml-1.5 text-ink-400">{i.sub}</span>}
              </p>
              <p className="shrink-0 text-[11px] tabular-nums text-ink-500 dark:text-ink-400">{i.anotacao}</p>
            </div>
            <div
              className="mt-1 w-full cursor-default"
              style={{ height: alturaBarra }}
              onMouseMove={(e) => i.dica && aoMover(e, i.dica)}
              onMouseLeave={aoSair}
            >
              <div
                // Canto arredondado só na ponta do dado; a base fica reta, presa
                // à linha de origem.
                className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{
                  width: `${Math.max(1, (i.valor / maior) * 100)}%`,
                  background: i.destaque ? 'var(--g-enfase)' : 'var(--g-apagado)',
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Dica dica={dica} />
    </>
  );
}

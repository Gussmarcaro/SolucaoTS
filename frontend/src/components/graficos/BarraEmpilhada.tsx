import { Dica, moedaCompacta, useDica, VAO } from './base';

export interface Segmento {
  rotulo: string;
  valor: number;
  /** Variável CSS, ex.: `var(--g-exec-pago)`. */
  cor: string;
}

export interface LinhaEmpilhada {
  id: string;
  rotulo: string;
  sub?: string;
  segmentos: Segmento[];
  /** Texto curto à direita, no lugar do valor somado. */
  anotacao?: string;
}

/**
 * Barra empilhada horizontal — parte-do-todo, uma linha por item.
 *
 * **Horizontal, e não em coluna**, porque os rótulos são nomes longos de
 * entidade e de ajuste: em coluna eles girariam 45° ou seriam cortados.
 *
 * **A escala é compartilhada entre as linhas**, não 100% por linha. Essa é a
 * decisão que muda o que se lê: com cada linha normalizada, uma parceria de
 * R$ 20 mil parada ocuparia a mesma largura de uma de R$ 2 milhões parada, e a
 * tela esconderia justamente a diferença que importa. Compartilhando a escala, o
 * comprimento do segmento é dinheiro de verdade.
 */
export function BarraEmpilhada({
  linhas,
  alturaBarra = 14,
}: {
  linhas: LinhaEmpilhada[];
  alturaBarra?: number;
}) {
  const { dica, aoMover, aoSair } = useDica();

  const totalDe = (l: LinhaEmpilhada) => l.segmentos.reduce((s, g) => s + Math.max(0, g.valor), 0);
  const maior = Math.max(1, ...linhas.map(totalDe));

  return (
    <>
      <ul className="space-y-2.5">
        {linhas.map((l) => {
          const total = totalDe(l);
          // Largura da linha inteira em relação à maior — é o que mantém a
          // comparação entre parcerias honesta.
          const larguraLinha = (total / maior) * 100;

          return (
            <li key={l.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-medium text-ink-700 dark:text-ink-200">
                  {l.rotulo}
                  {l.sub && <span className="ml-1.5 font-normal text-ink-400">{l.sub}</span>}
                </p>
                <p className="shrink-0 text-[11px] tabular-nums text-ink-500 dark:text-ink-400">
                  {l.anotacao ?? moedaCompacta(total)}
                </p>
              </div>

              <div className="mt-1 w-full" style={{ height: alturaBarra }}>
                <div
                  className="flex h-full overflow-hidden rounded-[4px]"
                  style={{ width: `${larguraLinha}%`, gap: VAO }}
                >
                  {l.segmentos.map((g) =>
                    g.valor <= 0 ? null : (
                      <div
                        key={g.rotulo}
                        onMouseMove={(e) =>
                          aoMover(
                            e,
                            <>
                              <strong className="font-semibold">{l.rotulo}</strong>
                              <br />
                              {g.rotulo}: {g.valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                              <br />
                              <span className="text-ink-400">
                                {total > 0 ? ((g.valor / total) * 100).toFixed(1).replace('.', ',') : '0'}% do
                                valor global
                              </span>
                            </>,
                          )
                        }
                        onMouseLeave={aoSair}
                        // `flexGrow` dentro da linha: o navegador reparte o
                        // espaço e desconta os vãos sozinho. Calcular a largura
                        // em porcentagem aqui deixaria a soma passar de 100%
                        // quando houvesse vão entre os segmentos.
                        style={{ flexGrow: g.valor, flexBasis: 0, background: g.cor }}
                        className="h-full min-w-[3px] cursor-default transition-opacity hover:opacity-80"
                      />
                    ),
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Dica dica={dica} />
    </>
  );
}

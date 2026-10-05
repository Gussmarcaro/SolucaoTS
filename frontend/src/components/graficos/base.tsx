import { useCallback, useState, type ReactNode } from 'react';

// Reexportado para os componentes continuarem importando de um lugar só; a
// implementação vive em `escala.ts`, que é onde está travada por teste.
export { moedaCompacta } from './escala';

/**
 * Peças comuns dos gráficos.
 *
 * ## Por que HTML e CSS, e não SVG com `viewBox`
 *
 * Barra, barra empilhada e dumbbell são retângulos e círculos posicionados por
 * porcentagem — coisa que o CSS faz nativamente e que no SVG exigiria calcular
 * largura, escala e posição à mão, de novo a cada ponto de quebra. Geometria
 * calculada é geometria que erra: rótulo sobreposto, barra estourando o quadro,
 * eixo fora de lugar. Aqui o navegador faz a conta.
 *
 * ## Por que nenhuma biblioteca
 *
 * Recharts custaria ~100 KB gzipados no pedaço inicial para desenhar retângulos,
 * e o `vendor` separado em `vite.config.ts` existe justamente para esse tipo de
 * cuidado. Além do peso, as cores teriam de ser configuradas duas vezes (claro e
 * escuro) em JavaScript — aqui a variável CSS troca sozinha.
 *
 * ## As duas regras de forma que valem em todos
 *
 * - **O vão de 2px é da superfície**, não um contorno. Segmentos encostados se
 *   separam pelo espaço vazio; traço em volta da marca é tinta que não é dado.
 * - **Texto nunca veste a cor da série.** Rótulo, valor e legenda usam os tons
 *   de `ink`; a identidade vem da bolinha colorida ao lado. Um azul claro é
 *   ilegível como texto sobre fundo branco.
 */

/** Espaço da superfície entre marcas que se encostam. */
export const VAO = 2;

export interface ItemLegenda {
  rotulo: string;
  /** Variável CSS da cor, ex.: `var(--g-exec-pago)`. */
  cor: string;
  /** Ícone opcional — obrigatório quando a cor significa **estado**. */
  icone?: ReactNode;
}

/**
 * Legenda.
 *
 * Presente sempre que houver duas séries ou mais: é o canal de identidade
 * confiável, e obrigar o leitor a casar cores de memória não é acessibilidade.
 * **Série única não recebe legenda** — há uma cor só, e o título já diz o que
 * está desenhado; uma caixa com um quadradinho repetiria o título.
 *
 * **`estado` é a exceção, e ela nasceu de um defeito real.** Com uma única
 * situação cadastrada, "Prestações por situação" desenhava a barra e nada
 * dizia o que aquela cor significava: o título diz *o que* está plotado, não
 * *qual estado* a cor representa. Cor de estado nunca pode viajar sozinha —
 * ela carrega um juízo (aceito, rejeitado, em elaboração), e o leitor não tem
 * como deduzi-lo olhando. Com uma série comum o título basta; com estado, não.
 */
export function Legenda({ itens, estado = false }: { itens: ItemLegenda[]; estado?: boolean }) {
  if (itens.length < (estado ? 1 : 2)) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: i.cor }}
          />
          {i.icone}
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

interface EstadoDica {
  x: number;
  y: number;
  conteudo: ReactNode;
}

/**
 * Camada de passagem do ponteiro.
 *
 * Um gráfico em HTML **é** interativo, e rotular todo ponto seria o caos que a
 * legenda e a dica existem para evitar: o rótulo direto fica para o extremo e
 * para o que a história é; o resto o leitor pede passando o mouse.
 *
 * A posição é guardada em coordenadas do container (`offsetX/Y`), não da página:
 * assim a dica acompanha o gráfico quando a tela rola.
 */
export function useDica() {
  const [dica, setDica] = useState<EstadoDica | null>(null);

  const aoMover = useCallback((e: React.MouseEvent<HTMLElement>, conteudo: ReactNode) => {
    const caixa = e.currentTarget.closest('[data-grafico]') as HTMLElement | null;
    if (!caixa) return;
    const r = caixa.getBoundingClientRect();
    setDica({ x: e.clientX - r.left, y: e.clientY - r.top, conteudo });
  }, []);

  const aoSair = useCallback(() => setDica(null), []);

  return { dica, aoMover, aoSair };
}

export function Dica({ dica }: { dica: EstadoDica | null }) {
  if (!dica) return null;
  return (
    <div
      role="tooltip"
      // `translate(-50%, -100%)` ancora a dica acima do ponteiro; o deslocamento
      // de 10px evita que ela fique sob o cursor e pisque.
      className="pointer-events-none absolute z-20 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] leading-relaxed text-ink-700 shadow-pop dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
      style={{ left: dica.x, top: dica.y - 10 }}
    >
      {dica.conteudo}
    </div>
  );
}

/**
 * Moldura de um gráfico: título, subtítulo e a área desenhada.
 *
 * O `data-grafico` não é enfeite — é a âncora que `useDica` procura para
 * converter a posição do ponteiro em coordenada local.
 */
export function Figura({
  titulo,
  subtitulo,
  icone,
  acao,
  legenda,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  icone?: ReactNode;
  acao?: ReactNode;
  legenda?: ItemLegenda[];
  children: ReactNode;
}) {
  return (
    <section
      data-grafico
      className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-2.5 dark:border-ink-800">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
            {icone}
            {titulo}
          </h3>
          {subtitulo && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{subtitulo}</p>
          )}
        </div>
        {acao}
      </div>

      <div className="px-4 py-3">{children}</div>

      {legenda && legenda.length > 1 && (
        <div className="border-t border-ink-100 px-4 py-2 dark:border-ink-800">
          <Legenda itens={legenda} />
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * O balão do menu recolhido.
 *
 * Substitui o `title` do navegador, e não por gosto: aquele demora cerca de um
 * segundo para aparecer, é desenhado pelo sistema operacional (não acompanha o
 * tema), some sozinho depois de uns segundos e **não aceita conteúdo** — só
 * texto puro.
 *
 * Esse último ponto é o que importa aqui. No trilho recolhido, um item com
 * submenu não tem para onde levar: clicar nele só reabre o menu. Com um balão
 * que aceita nós, o submenu inteiro cabe dentro dele, e o trilho passa a ser
 * navegável sem expandir nada.
 *
 * **Vai por portal, em posição fixa.** O `<nav>` do menu tem `overflow-y-auto`
 * para a lista rolar; um balão posicionado por dentro dele seria cortado na
 * borda do trilho de 76px — que é exatamente onde ele precisa aparecer.
 */

/** Distância entre o trilho e o balão. Perto o bastante para o mouse atravessar. */
const FOLGA = 8;

/**
 * Atraso para abrir.
 *
 * Curto o bastante para parecer instantâneo, longo o bastante para o balão não
 * piscar enquanto o mouse atravessa a coluna a caminho de outra coisa.
 */
const ATRASO_ABRIR = 60;

/**
 * Carência para fechar.
 *
 * O mouse precisa cruzar o vão entre o ícone e o balão; fechar no `mouseleave`
 * do ícone tornaria o conteúdo inalcançável — o balão sumiria no meio do
 * caminho, toda vez.
 */
const CARENCIA_FECHAR = 120;

interface Props {
  /** O que o balão mostra: rótulo e, quando houver, o submenu. */
  conteudo: ReactNode;
  /** O item do trilho. */
  children: ReactNode;
}

export function DicaTrilho({ conteudo, children }: Props) {
  const alvo = useRef<HTMLDivElement>(null);
  const cronometro = useRef<number>();
  const [caixa, setCaixa] = useState<{ topo: number; esquerda: number } | null>(null);

  const abrir = () => {
    window.clearTimeout(cronometro.current);
    cronometro.current = window.setTimeout(() => {
      const r = alvo.current?.getBoundingClientRect();
      if (!r) return;
      // Alinhado pelo **topo** do ícone, não pelo centro: com o submenu dentro,
      // o balão fica mais alto que o ícone, e centralizar o jogaria para fora
      // da tela nos itens do fim da lista.
      setCaixa({ topo: r.top, esquerda: r.right + FOLGA });
    }, ATRASO_ABRIR);
  };

  const fechar = () => {
    window.clearTimeout(cronometro.current);
    cronometro.current = window.setTimeout(() => setCaixa(null), CARENCIA_FECHAR);
  };

  // Rolar ou redimensionar com o balão aberto o deixaria flutuando no lugar
  // errado: a posição foi calculada uma vez, em coordenadas de tela.
  useEffect(() => {
    if (!caixa) return;
    const some = () => setCaixa(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && some();
    window.addEventListener('scroll', some, true);
    window.addEventListener('resize', some);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('scroll', some, true);
      window.removeEventListener('resize', some);
      window.removeEventListener('keydown', esc);
    };
  }, [caixa]);

  useEffect(() => () => window.clearTimeout(cronometro.current), []);

  return (
    <div
      ref={alvo}
      onMouseEnter={abrir}
      onMouseLeave={fechar}
      // Teclado: quem navega por Tab precisa do mesmo rótulo que o mouse
      // revela — sem isto o trilho recolhido é uma coluna de ícones mudos.
      onFocus={abrir}
      onBlur={fechar}
    >
      {children}

      {caixa &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: caixa.topo, left: caixa.esquerda }}
            onMouseEnter={() => window.clearTimeout(cronometro.current)}
            onMouseLeave={fechar}
            className="fixed z-50 min-w-[13rem] max-w-xs animate-fade-in rounded-xl border border-ink-200/70 bg-white p-1.5 shadow-xl dark:border-ink-700/70 dark:bg-ink-800"
          >
            {/* A seta é o que liga o balão ao ícone: sem ela, ele parece um
                painel solto que apareceu do nada ao lado da tela. */}
            <span className="absolute -left-[5px] top-[14px] h-2.5 w-2.5 rotate-45 border-b border-l border-ink-200/70 bg-white dark:border-ink-700/70 dark:bg-ink-800" />
            <div className="relative">{conteudo}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}

import { useState } from 'react';

/**
 * Tamanhos de página oferecidos nas grades.
 *
 * O maior valor é 100 porque é o teto do backend (`shared/paginacao.ts`). Os
 * dois precisam andar juntos: oferecer 500 aqui faria o servidor recortar em
 * silêncio, e a tela mostraria "500 por página" exibindo 100.
 */
export const OPCOES_PAGINA = [15, 30, 50, 100] as const;

export const PAGE_SIZE_PADRAO = 15;

const CHAVE = 'grade:pageSize';

/**
 * Tamanho de página escolhido pelo usuário, lembrado por tela.
 *
 * É preferência de trabalho, não dado: quem opera Fornecedores com 100 por
 * página costuma querer 100 amanhã também, e reescolher a cada visita seria
 * atrito puro. Fica no `localStorage`, como o layout das colunas da grade.
 */
export function usePageSize(tela: string): [number, (n: number) => void] {
  const chave = `${CHAVE}:${tela}`;

  const [valor, setValor] = useState<number>(() => {
    const salvo = Number(localStorage.getItem(chave));
    // Valor fora da lista (opção removida, storage adulterado) volta ao padrão
    // em vez de virar uma página de tamanho estranho.
    return OPCOES_PAGINA.includes(salvo as (typeof OPCOES_PAGINA)[number])
      ? salvo
      : PAGE_SIZE_PADRAO;
  });

  return [
    valor,
    (n: number) => {
      setValor(n);
      localStorage.setItem(chave, String(n));
    },
  ];
}

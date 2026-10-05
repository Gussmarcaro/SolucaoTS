/**
 * A aritmética dos gráficos.
 *
 * Fica separada dos componentes porque é o que **erra calado**: uma posição mal
 * normalizada não quebra tela nenhuma — desenha a parcela no dia errado, e o
 * atraso que o painel existe para mostrar aparece com o comprimento errado.
 *
 * Travada por `escala.test.ts`.
 */

/**
 * Converte 'YYYY-MM-DD' num número de dias comparável, **sem passar por `Date`
 * local**.
 *
 * `new Date('2026-03-01')` é lido como meia-noite UTC e, no fuso de São Paulo,
 * volta como 28/02 — o mesmo deslocamento que `dataBr` existe para evitar. Como
 * aqui só é preciso ordenar e medir distância, o epoch em UTC resolve sem
 * nenhuma conversão de fuso.
 */
export function emDias(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return null;
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

/**
 * Normaliza um valor para 0..1 dentro de uma janela.
 *
 * **Janela de largura zero devolve 0**, não `NaN`: acontece de verdade quando
 * todas as parcelas caem no mesmo dia, e um `NaN` viraria `left: NaN%`, que o
 * navegador descarta em silêncio — os pontos empilhariam no canto esquerdo sem
 * nenhum erro no console.
 */
export function normalizar(valor: number, inicio: number, fim: number): number {
  const span = fim - inicio;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (valor - inicio) / span));
}

/** `1.284.000` → `R$ 1,3 mi`. Valor grande não cabe ao lado de uma barra. */
export function moedaCompacta(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000)
    return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

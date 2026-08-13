/**
 * Contagem de dias úteis.
 *
 * **Sem calendário de feriados.** O TCESP conta os prazos em dias úteis, e
 * feriado empurra o vencimento para a frente — ou seja, o prazo real é sempre
 * igual ou **maior** que o calculado aqui.
 *
 * Essa direção do erro é o que torna a simplificação aceitável para alertar:
 * avisamos cedo demais, nunca tarde demais. O contrário — supor feriados que
 * não existem — faria o sistema dizer "ainda há tempo" quando já não há.
 *
 * Quando o calendário oficial entrar, é aqui que ele encaixa.
 */

const FIM_DE_SEMANA = new Set([0, 6]); // domingo e sábado

/** `data` + `dias` dias úteis, contando a partir do dia seguinte. */
export function somarDiasUteis(data: Date, dias: number): Date {
  const d = new Date(data.getTime());
  let restantes = dias;
  while (restantes > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!FIM_DE_SEMANA.has(d.getUTCDay())) restantes -= 1;
  }
  return d;
}

/** Dias corridos de hoje até `data`. Negativo quando já passou. */
export function diasAte(data: Date, hoje = new Date()): number {
  const umDia = 24 * 60 * 60 * 1000;
  const zerar = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((zerar(data) - zerar(hoje)) / umDia);
}

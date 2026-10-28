import { BusinessError } from './errors';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte 'YYYY-MM-DD' em Date (UTC meia-noite).
 *
 * **Lança `BusinessError`, e não `Error` seco** — data malformada é dado de
 * entrada, não defeito do servidor. Enquanto era `Error`, qualquer chamada que
 * não estivesse dentro de um `try` virava **500**: foi o que aconteceu com o
 * filtro de período da conciliação, onde um `<input type="date">` com ano de
 * cinco dígitos (`20267-06-01`, dois toques a mais na tecla) derrubava a tela
 * com "Erro interno do servidor". Os validadores que já traduzem a mensagem
 * continuam valendo: eles capturam qualquer erro e trocam pelo texto do campo.
 */
export function parseDataISO(valor: string): Date {
  const v = (valor ?? '').trim();
  const invalida = () => new BusinessError(`Data inválida: "${v}". Use o formato AAAA-MM-DD.`);
  if (!DATA_ISO.test(v)) throw invalida();
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw invalida();
  /*
   * Dia que não existe vira outro dia, calado.
   *
   * `new Date('2026-02-30T…')` não é inválida para o JavaScript: ela rola para
   * 2 de março. Sem conferir a volta, uma data impossível seria aceita como
   * outra — e o registro nasceria com um dia que ninguém digitou. É a mesma
   * conferência que `parseDataBR` já fazia para o formato brasileiro.
   */
  if (paraDataISO(d) !== v) throw invalida();
  return d;
}

/** Formata um Date como 'YYYY-MM-DD' (UTC). */
export function paraDataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

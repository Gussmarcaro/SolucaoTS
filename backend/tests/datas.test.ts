import { describe, expect, it } from 'vitest';
import { AppError } from '../src/shared/errors';
import { paraDataISO, parseDataISO } from '../src/shared/datas';

/**
 * Data de entrada **não derruba o servidor** — sem banco, sem rede.
 *
 * O caso real: no filtro de período da conciliação, um `<input type="date">`
 * com ano de cinco dígitos chegou ao servidor e a tela respondeu "Erro interno
 * do servidor (código 11111e4f)". Era `parseDataISO` lançando `Error` seco, que
 * o tratador classifica como 500 — defeito do servidor, quando a verdade é que
 * o dado estava errado.
 *
 * A distinção importa além da cortesia: 5xx é o que vira alerta, o que se
 * investiga e o que faz o usuário achar que o sistema quebrou. Dado inválido é
 * uso normal.
 */
describe('parseDataISO', () => {
  it('lê a data ISO como meia-noite UTC', () => {
    expect(paraDataISO(parseDataISO('2026-06-01'))).toBe('2026-06-01');
  });

  const recusadas: [string, string][] = [
    ['ano de cinco dígitos', '20267-06-01'],
    ['formato brasileiro', '01/06/2026'],
    ['data pela metade', '2026-06'],
    ['mês que não existe', '2026-13-01'],
    ['dia que não existe', '2026-02-30'],
    ['vazio', ''],
  ];

  it.each(recusadas)('recusa %s como erro de entrada (422), não como 500', (_, valor) => {
    expect(() => parseDataISO(valor)).toThrow(AppError);
    try {
      parseDataISO(valor);
    } catch (e) {
      // É o `status` que decide se a tela diz "dado inválido" ou "erro interno".
      expect((e as AppError).statusCode).toBe(422);
      expect((e as AppError).message).toContain('Data inválida');
    }
  });
});

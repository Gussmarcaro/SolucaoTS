import { describe, expect, it } from 'vitest';
import { janelaDoExercicio, rotuloJanela } from './planoAplicacao';

/**
 * Competências do plano — **duplicadas de propósito, e por isso testadas**.
 *
 * A mesma regra existe em `core/planoAplicacao/competencias.ts`. Divergindo, a
 * tela promete um anual e o servidor grava outro — e o plano é o teto contra o
 * qual a despesa da prestação é conferida. Os números aqui são os mesmos de lá.
 */

describe('janelaDoExercicio', () => {
  it('cobre o ano inteiro quando a vigência o contém', () => {
    expect(janelaDoExercicio(2026, '2025-01-01', '2028-12-31')).toEqual({
      primeiro: 1,
      ultimo: 12,
      meses: 12,
      parcial: false,
    });
  });

  it('corta o primeiro ano pelo mês de início', () => {
    // Convênio de 01/06/2026 a 31/05/2027: sete competências em 2026.
    expect(janelaDoExercicio(2026, '2026-06-01', '2027-05-31')).toEqual({
      primeiro: 6,
      ultimo: 12,
      meses: 7,
      parcial: true,
    });
  });

  it('corta o último ano pelo mês de fim', () => {
    // E cinco em 2027 — não doze, que é o que se gravava antes.
    expect(janelaDoExercicio(2027, '2026-06-01', '2027-05-31')).toEqual({
      primeiro: 1,
      ultimo: 5,
      meses: 5,
      parcial: true,
    });
  });

  it('corta dos dois lados quando a vigência cabe num ano só', () => {
    expect(janelaDoExercicio(2026, '2026-03-10', '2026-08-31')).toEqual({
      primeiro: 3,
      ultimo: 8,
      meses: 6,
      parcial: true,
    });
  });

  it('o dia não conta, só o mês', () => {
    // O plano é por competência mensal; não há meio mês de rubrica.
    expect(janelaDoExercicio(2026, '2026-06-30', '2026-12-01')).toEqual(
      janelaDoExercicio(2026, '2026-06-01', '2026-12-31'),
    );
  });

  it('aceita vigência de um mês só', () => {
    const j = janelaDoExercicio(2026, '2026-07-05', '2026-07-28');
    expect(j).toEqual({ primeiro: 7, ultimo: 7, meses: 1, parcial: true });
  });

  it('devolve o ano cheio quando falta a vigência', () => {
    // Ajuste antigo sem datas: a regra nova não pode trancar o que já existia.
    expect(janelaDoExercicio(2026, null, '2027-05-31')?.meses).toBe(12);
    expect(janelaDoExercicio(2026, '2026-06-01', null)?.meses).toBe(12);
    expect(janelaDoExercicio(2026, null, null)?.meses).toBe(12);
    expect(janelaDoExercicio(2026, '01/06/2026', '31/05/2027')?.meses).toBe(12);
  });

  it('devolve nulo quando o exercício está fora da vigência', () => {
    // Não é um plano menor — é um plano de um ano em que a parceria não vigora.
    expect(janelaDoExercicio(2025, '2026-06-01', '2027-05-31')).toBeNull();
    expect(janelaDoExercicio(2028, '2026-06-01', '2027-05-31')).toBeNull();
  });

  it('não confunde o ano inteiro com um recorte de doze meses', () => {
    const j = janelaDoExercicio(2026, '2026-01-01', '2026-12-31');
    expect(j?.parcial).toBe(false);
  });
});

describe('rotuloJanela', () => {
  it('nomeia o período e conta as competências', () => {
    const j = janelaDoExercicio(2026, '2026-06-01', '2027-05-31')!;
    expect(rotuloJanela(2026, j)).toBe('jun/2026 a dez/2026 · 7 competências');
  });

  it('não escreve "jul a jul" quando é um mês só', () => {
    const j = janelaDoExercicio(2026, '2026-07-01', '2026-07-31')!;
    expect(rotuloJanela(2026, j)).toBe('jul/2026 · 1 competência');
  });
});

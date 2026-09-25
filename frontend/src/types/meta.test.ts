import { describe, expect, it } from 'vitest';
import {
  PERIODICIDADES_META,
  TIPOS_META,
  distribuirProporcional,
  ehQuantificavel,
  gerarPeriodos,
  intervaloPeriodo,
  periodosNoAno,
  rotuloPeriodo,
  temDetalhePeriodico,
  type PeriodicidadeMeta,
} from './meta';

/**
 * Períodos da meta — **duplicados de propósito, e por isso testados**.
 *
 * A mesma aritmética existe em `core/meta/periodos.ts`, no backend, e é
 * conferida por `npm run verificar:metas`. Os números aqui são **os mesmos de
 * lá**: se um dos lados mudar, este arquivo é onde a divergência aparece.
 *
 * O custo de divergir é específico: a tela oferece um quadro de períodos que o
 * servidor recusa, e a mensagem fala de um período que o usuário não digitou —
 * ele os recebeu prontos.
 */

const compacto = (ps: ReturnType<typeof gerarPeriodos>) =>
  ps.map((p) => `${p.periodo}:${p.mesInicial}-${p.mesFinal}/${p.ano}${p.parcial ? '*' : ''}`);

describe('gerarPeriodos', () => {
  it('reproduz o exemplo do manual: vigência de 01/06, quadrimestral', () => {
    // "na primeira periodicidade haverá somente 3 meses (junho, julho e agosto)
    //  e na última somente um mês (maio)"
    const ps = gerarPeriodos('QUADRIMESTRAL', '2025-06-01', '2026-05-31');
    expect(compacto(ps)).toEqual(['2:6-8/2025*', '3:9-12/2025', '1:1-4/2026', '2:5-5/2026*']);
    expect(ps[0].meses).toBe(3);
    expect(ps[3].meses).toBe(1);
  });

  it('numera pelo ano civil, não a partir do início da vigência', () => {
    // O erro que a implementação ingênua comete: contar de 2 em 2 meses desde
    // o início. Nov/dez é o 6º bimestre de 2025 — não o 1º de coisa nenhuma.
    const ps = gerarPeriodos('BIMESTRAL', '2025-11-01', '2026-02-28');
    expect(compacto(ps)).toEqual(['6:11-12/2025', '1:1-2/2026']);
  });

  it('num ano civil cheio, nada é parcial', () => {
    const ps = gerarPeriodos('MENSAL', '2025-01-01', '2025-12-31');
    expect(ps).toHaveLength(12);
    expect(ps.every((p) => !p.parcial && p.meses === 1)).toBe(true);
  });

  it('corta dos dois lados quando a vigência começa e termina no meio', () => {
    const ps = gerarPeriodos('SEMESTRAL', '2025-03-15', '2025-09-10');
    expect(compacto(ps)).toEqual(['1:3-6/2025*', '2:7-9/2025*']);
  });

  it('só o mês conta — o dia não faz pro rata', () => {
    const cheio = gerarPeriodos('TRIMESTRAL', '2025-07-01', '2025-09-30');
    const meio = gerarPeriodos('TRIMESTRAL', '2025-07-20', '2025-09-02');
    expect(compacto(meio)).toEqual(compacto(cheio));
  });

  it('devolve vazio sem vigência completa ou com datas invertidas', () => {
    expect(gerarPeriodos('MENSAL', null, '2025-12-31')).toEqual([]);
    expect(gerarPeriodos('MENSAL', '2025-01-01', null)).toEqual([]);
    expect(gerarPeriodos('MENSAL', '2025-12-01', '2025-01-01')).toEqual([]);
    expect(gerarPeriodos('MENSAL', '01/01/2025', '2025-12-31')).toEqual([]);
  });

  it('não desloca por fuso — dezembro não vira janeiro', () => {
    // O motivo de ler a string em vez de construir um `Date`: em GMT-3,
    // `new Date('2025-12-31')` é 31/12 21:00 local, e um `getMonth()` descuidado
    // daria o mês errado na virada.
    const ps = gerarPeriodos('MENSAL', '2025-12-01', '2025-12-31');
    expect(compacto(ps)).toEqual(['12:12-12/2025']);
  });

  it('única cobre a vigência inteira num período só', () => {
    const ps = gerarPeriodos('UNICA', '2025-06-01', '2026-05-31');
    expect(ps).toHaveLength(1);
    expect(ps[0].meses).toBe(12);
  });

  it('todo período tem rótulo e intervalo legíveis', () => {
    for (const { id } of PERIODICIDADES_META) {
      const ps = gerarPeriodos(id as PeriodicidadeMeta, '2025-01-01', '2025-12-31');
      expect(ps.length).toBeGreaterThan(0);
      for (const p of ps) {
        expect(rotuloPeriodo(id as PeriodicidadeMeta, p).trim()).not.toBe('');
        expect(intervaloPeriodo(p)).toContain('2025');
      }
    }
  });

  it('intervalo de um mês só não vira "jun–jun"', () => {
    const [p] = gerarPeriodos('QUADRIMESTRAL', '2026-05-01', '2026-05-31');
    expect(intervaloPeriodo(p)).toBe('mai/2026');
  });
});

describe('tipos de meta', () => {
  it('são três, e só a não quantificável fica sem número', () => {
    expect(TIPOS_META).toHaveLength(3);
    expect(TIPOS_META.filter((t) => !ehQuantificavel(t.id)).map((t) => t.id)).toEqual([
      'QUALITATIVA_NAO_QUANTIFICAVEL',
    ]);
  });

  it('quem não tem número não tem quadro de períodos', () => {
    expect(TIPOS_META.every((t) => ehQuantificavel(t.id) === temDetalhePeriodico(t.id))).toBe(true);
  });

  it('a tabela de periodicidades bate com a aritmética', () => {
    expect(periodosNoAno('MENSAL')).toBe(12);
    expect(periodosNoAno('QUADRIMESTRAL')).toBe(3);
    expect(periodosNoAno('EXERCICIO')).toBe(1);
  });
});

describe('distribuirProporcional', () => {
  it('reparte pelos meses e fecha o total', () => {
    const ps = gerarPeriodos('QUADRIMESTRAL', '2025-06-01', '2026-05-31'); // 3,4,4,1
    expect(distribuirProporcional(1200, ps)).toEqual([300, 400, 400, 100]);
  });

  it('soma exatamente o total mesmo quando não divide', () => {
    // 100 em 3 partes: arredondar cada uma por conta própria daria 99,99 — e é
    // justamente a soma que alguém vai conferir à mão.
    const ps = gerarPeriodos('QUADRIMESTRAL', '2025-01-01', '2025-12-31');
    const partes = distribuirProporcional(100, ps);
    expect(Math.round(partes.reduce((s, v) => s + v, 0) * 100) / 100).toBe(100);
    expect(partes.every((v) => Math.abs(v - 100 / 3) <= 0.01)).toBe(true);
  });

  it('sem períodos, nada a distribuir', () => {
    expect(distribuirProporcional(100, [])).toEqual([]);
  });
});

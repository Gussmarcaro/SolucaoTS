import { describe, expect, it } from 'vitest';
import {
  PERIODICIDADES_META,
  QUALIFICADORES_META,
  apurarMetas,
  avaliarMeta,
  TIPOS_META,
  distribuirProporcional,
  ehQuantificavel,
  gerarPeriodos,
  intervaloPeriodo,
  periodosNoAno,
  rotuloPeriodo,
  temDetalhePeriodico,
  type PeriodicidadeMeta,
  type QualificadorMeta,
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

describe('qualificadores', () => {
  it('são os sete do cadastro do AUDESP', () => {
    expect(QUALIFICADORES_META.map((q) => q.rotulo)).toEqual([
      'Igual a',
      'Maior que',
      'Maior ou igual a',
      'Menor que',
      'Menor ou igual a',
      'Reduzir em',
      'Aumentar em',
    ]);
  });

  it('separa comparação de variação', () => {
    expect(QUALIFICADORES_META.filter((q) => q.relativo).map((q) => q.id)).toEqual([
      'REDUZIR_EM',
      'AUMENTAR_EM',
    ]);
  });
});

describe('avaliarMeta', () => {
  // Os mesmos números de `verificar:metas`. Divergindo, um dos dois fica vermelho.
  it('distingue "igual a" de "maior que" — o caso que motiva o campo', () => {
    expect(avaliarMeta('IGUAL_A', 4, 5).atingiu).toBe(false);
    expect(avaliarMeta('MAIOR_QUE', 4, 5).atingiu).toBe(true);
    expect(avaliarMeta('MAIOR_QUE', 4, 4).atingiu).toBe(false);
    expect(avaliarMeta('MAIOR_OU_IGUAL_A', 4, 4).atingiu).toBe(true);
  });

  it('lê as metas de teto ao contrário das de piso', () => {
    expect(avaliarMeta('MENOR_QUE', 50, 45).atingiu).toBe(true);
    expect(avaliarMeta('MENOR_QUE', 50, 50).atingiu).toBe(false);
    expect(avaliarMeta('MENOR_OU_IGUAL_A', 50, 50).atingiu).toBe(true);
  });

  it('dá sinal ao desvio, para a tela não escrever "faltam" sobre um excesso', () => {
    expect(avaliarMeta('MENOR_OU_IGUAL_A', 50, 60).diferenca).toBe(-10);
    expect(avaliarMeta('MAIOR_OU_IGUAL_A', 50, 40).diferenca).toBe(10);
  });

  it('não afirma nada sobre metas de variação', () => {
    // Sem o ponto de partida, um verde ali seria conferência inventada.
    expect(avaliarMeta('REDUZIR_EM', 15, 20).atingiu).toBeNull();
    expect(avaliarMeta('REDUZIR_EM', 15, 20).percentual).toBeNull();
    expect(avaliarMeta('AUMENTAR_EM', 15, 20).atingiu).toBeNull();
  });

  it('sem realizado é indeterminado em qualquer qualificador', () => {
    for (const q of QUALIFICADORES_META) expect(avaliarMeta(q.id, 10, null).atingiu).toBeNull();
  });

  it('dá um centavo de folga ao ponto flutuante', () => {
    expect(avaliarMeta('IGUAL_A', 10.5, 10.5).atingiu).toBe(true);
    expect(avaliarMeta('IGUAL_A', 0.1 + 0.2, 0.3).atingiu).toBe(true);
  });
});

describe('apurarMetas', () => {
  /**
   * Os mesmos números de `verificar:metas`, e com um motivo mais forte que o
   * de costume: este percentual pode virar **desconto no repasse**. Se os dois
   * lados divergirem, a aba mostra um número e o painel de pendências outro.
   */
  const prev = (meta: string, periodo: number, q: QualificadorMeta, qtd: number) => ({
    nomePrograma: 'Saúde',
    codigoMeta: meta,
    ano: 2026,
    periodo,
    qualificador: q,
    quantidade: qtd,
  });
  const afer = (meta: string, periodo: number, realizada: number | null, extra = {}) => ({
    nomePrograma: 'Saúde',
    codigoMeta: meta,
    periodo,
    quantidadeRealizada: realizada,
    resultadoMeta: null,
    metaAtendida: null,
    justificativa: null,
    ...extra,
  });

  it('lê a meta de prazo ao contrário da meta de volume', () => {
    // "250 consultas (maior ou igual)" e "entregar até o dia 20 (menor ou
    // igual)" — ler as duas do mesmo jeito descontaria de quem entregou antes.
    const r = apurarMetas(
      [afer('01', 1, 260), afer('01', 2, 240), afer('02', 1, 18), afer('02', 2, 25)],
      [
        prev('01', 1, 'MAIOR_OU_IGUAL_A', 250),
        prev('01', 2, 'MAIOR_OU_IGUAL_A', 250),
        prev('02', 1, 'MENOR_OU_IGUAL_A', 20),
        prev('02', 2, 'MENOR_OU_IGUAL_A', 20),
      ],
      2026,
    );
    expect([r.atingidas, r.naoAtingidas, r.percentualNaoAtingido]).toEqual([2, 2, 50]);
  });

  it('apura por período: um mês ruim em doze dá 8,33%', () => {
    const previstos = Array.from({ length: 12 }, (_, i) =>
      prev('01', i + 1, 'MAIOR_OU_IGUAL_A', 250),
    );
    const afericoes = Array.from({ length: 12 }, (_, i) => afer('01', i + 1, i === 2 ? 100 : 300));
    expect(apurarMetas(afericoes, previstos, 2026).percentualNaoAtingido).toBe(8.33);
  });

  it('deixa fora do percentual o que não sabe apurar', () => {
    const r = apurarMetas(
      [afer('01', 1, 300), afer('01', 2, 100), afer('99', 1, 50), afer('02', 1, 5)],
      [
        prev('01', 1, 'MAIOR_OU_IGUAL_A', 250),
        prev('01', 2, 'MAIOR_OU_IGUAL_A', 250),
        prev('02', 1, 'REDUZIR_EM', 10),
      ],
      2026,
    );
    // Meta sem previsto e meta de variação: nenhuma das duas vira desconto.
    expect(r.indeterminadas).toBe(2);
    expect(r.percentualNaoAtingido).toBe(50);
  });

  it('trata "cumprida parcialmente" como descumprimento', () => {
    const q = (meta: string, resultadoMeta: string) => afer(meta, 1, null, { resultadoMeta });
    const r = apurarMetas(
      [q('01', 'CUMPRIDA'), q('02', 'NAO_CUMPRIDA'), q('03', 'CUMPRIDA_PARCIALMENTE')],
      [],
      2026,
    );
    // A definição do TCESP fala em "descumprimento parcial ou integral".
    expect([r.atingidas, r.naoAtingidas]).toEqual([1, 2]);
  });

  it('deixa o julgamento humano vencer a aritmética', () => {
    const r = apurarMetas(
      [afer('01', 1, 300, { metaAtendida: false })],
      [prev('01', 1, 'MAIOR_OU_IGUAL_A', 250)],
      2026,
    );
    expect(r.naoAtingidas).toBe(1);
  });

  it('separa divergência de falta de justificativa', () => {
    const r = apurarMetas(
      [
        afer('01', 1, 100, { metaAtendida: true }),
        afer('01', 2, 100, { justificativa: 'greve dos servidores' }),
        afer('01', 3, 100),
      ],
      [1, 2, 3].map((p) => prev('01', p, 'MAIOR_OU_IGUAL_A', 250)),
      2026,
    );
    expect(r.naoAtingidas).toBe(3);
    expect(r.divergentes).toBe(1);
    expect(r.naoAtingidasSemJustificativa).toBe(2);
  });

  it('não cobra justificativa de meta atingida', () => {
    const r = apurarMetas(
      [afer('01', 1, 300)],
      [prev('01', 1, 'MAIOR_OU_IGUAL_A', 250)],
      2026,
    );
    expect(r.naoAtingidasSemJustificativa).toBe(0);
  });

  it('não liga aferição a previsto de outro exercício', () => {
    const r = apurarMetas([afer('01', 1, 100)], [prev('01', 1, 'MAIOR_OU_IGUAL_A', 250)], 2025);
    expect([r.indeterminadas, r.naoAtingidas]).toEqual([1, 0]);
  });

  it('não se perde por espaço ou caixa no nome', () => {
    // O vínculo com o plano é por texto, e é a maior fonte de rejeição da Fase V.
    const r = apurarMetas(
      [{ ...afer('01', 1, 300), nomePrograma: '  saúde  ', codigoMeta: ' 01 ' }],
      [prev('01', 1, 'MAIOR_OU_IGUAL_A', 250)],
      2026,
    );
    expect(r.atingidas).toBe(1);
  });

  it('não divide por zero com o relatório vazio', () => {
    const r = apurarMetas([], [prev('01', 1, 'IGUAL_A', 10)], 2026);
    expect([r.aferidas, r.percentualNaoAtingido]).toEqual([0, 0]);
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

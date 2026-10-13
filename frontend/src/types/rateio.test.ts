import { describe, expect, it } from 'vitest';
import {
  CASAS_EXIBIDAS,
  METODOS,
  calcularRateio,
  percentualBr,
  ratearValor,
  temQuadro,
  vigentesEm,
} from './rateio';

/**
 * Aritmética do rateio — **duplicada de propósito, e por isso testada**.
 *
 * A mesma conta existe aqui e em `core/rateio/Rateio.ts`, no backend. A tela
 * precisa recalcular a cada tecla, sem ida ao servidor; o servidor precisa
 * recusar dado inconsistente que chegue por outro caminho. Se divergirem, o
 * usuário vê um total e grava outro — e nada quebra para avisar.
 *
 * Os casos abaixo são os mesmos de `npm run verificar:rateio`.
 */

const id = (n: number) => `0000000${n}-0000-4000-8000-00000000000${n}`;

describe('calcularRateio', () => {
  it('reproduz o exemplo da especificação', () => {
    const r = calcularRateio([
      { ajusteId: id(1), base: 100000 },
      { ajusteId: id(2), base: 200000 },
      { ajusteId: id(3), base: 100000 },
      { ajusteId: id(4), base: 300000 },
      { ajusteId: id(5), base: 300000 },
    ]);
    expect(r.totalBase).toBe(1_000_000);
    expect(r.linhas.map((l) => l.percentualExibido)).toEqual([10, 20, 10, 30, 30]);
    expect(r.totalPercentual).toBe(100);
  });

  it('a mesma conta serve a colaboradores — ela não conhece a base', () => {
    const r = calcularRateio([
      { ajusteId: id(1), base: 100 },
      { ajusteId: id(2), base: 900 },
    ]);
    expect(r.totalBase).toBe(1000);
    expect(r.linhas.map((l) => l.percentualExibido)).toEqual([10, 90]);
  });

  /**
   * O caso que motivou o método do maior resto: três partes iguais dão
   * 33,333…%, e arredondar cada uma por conta própria soma 99,99%.
   */
  it('parcelas exibidas somam exatamente 100, mesmo com dízima', () => {
    const r = calcularRateio([1, 2, 3].map((n) => ({ ajusteId: id(n), base: 100 })));
    const exibidos = r.linhas.map((l) => l.percentualExibido);

    expect(exibidos.reduce((s, p) => s + p, 0)).toBe(100);
    expect(r.totalPercentual).toBe(100);
    // Uma parcela leva o centésimo que sobra; as outras ficam no piso.
    expect(exibidos.filter((p) => p === 33.34)).toHaveLength(1);
    expect(exibidos.filter((p) => p === 33.33)).toHaveLength(2);
    // E ninguém se afasta da parcela exata por mais de um centésimo.
    for (const l of r.linhas) expect(Math.abs(l.percentualExibido - l.percentual)).toBeLessThanOrEqual(0.01);
  });

  it('sete partes iguais também fecham', () => {
    const r = calcularRateio(Array.from({ length: 7 }, (_, i) => ({ ajusteId: id(i + 1), base: 1 })));
    expect(r.linhas.reduce((s, l) => s + l.percentualExibido, 0)).toBe(100);
  });

  it('o percentual exato continua disponível ao lado do exibido', () => {
    const r = calcularRateio([1, 2, 3].map((n) => ({ ajusteId: id(n), base: 100 })));
    expect(r.linhas[0].percentual).toBe(33.333333);
  });

  it('base total zero não divide por zero', () => {
    const r = calcularRateio([{ ajusteId: id(1), base: 0 }]);
    expect(r.linhas[0].percentual).toBe(0);
    expect(r.linhas[0].percentualExibido).toBe(0);
    expect(r.totalPercentual).toBe(0);
  });

  it('quadro vazio devolve zeros, não NaN', () => {
    const r = calcularRateio([]);
    expect(r.totalBase).toBe(0);
    expect(r.totalPercentual).toBe(0);
  });
});

describe('catálogo de métodos', () => {
  it('receita e colaboradores têm quadro; "Outros" não', () => {
    expect(temQuadro('RECEITA')).toBe(true);
    expect(temQuadro('COLABORADORES')).toBe(true);
    expect(temQuadro('OUTROS')).toBe(false);
  });

  it('todo método com quadro declara rótulo, formato e rótulo do total', () => {
    // Um método novo sem estes três apareceria com a coluna em branco — e é
    // exatamente o tipo de esquecimento que um catálogo permite.
    for (const m of METODOS.filter((x) => x.rotuloBase)) {
      expect(m.formato, m.id).toBeTruthy();
      expect(m.rotuloTotal, m.id).toBeTruthy();
    }
  });
});

describe('percentualBr', () => {
  it('sempre com as duas casas, para a coluna alinhar', () => {
    expect(percentualBr(10)).toBe('10,00%');
    expect(percentualBr(33.34)).toBe('33,34%');
    expect(percentualBr(0)).toBe('0,00%');
    expect(CASAS_EXIBIDAS).toBe(2);
  });
});

describe('vigentesEm', () => {
  const r = (vigenciaInicio: string, vigenciaFim: string, ativo = true) => ({
    vigenciaInicio,
    vigenciaFim,
    ativo,
  });
  const lista = [
    r('2026-01-01', '2026-06-30'),
    r('2026-07-01', '2026-12-31'),
    r('2026-01-01', '2026-12-31', false),
  ];

  it('acha o vigente na data', () => {
    expect(vigentesEm(lista, '2026-03-10')).toHaveLength(1);
  });

  it('o último dia do período ainda vale', () => {
    expect(vigentesEm(lista, '2026-06-30')).toHaveLength(1);
  });

  it('inativo não é vigente', () => {
    expect(vigentesEm(lista, '2026-08-10').every((x) => x.ativo)).toBe(true);
  });

  it('fora de qualquer período não devolve nada', () => {
    expect(vigentesEm(lista, '2025-12-31')).toHaveLength(0);
  });

  it('mais de um pode valer ao mesmo tempo', () => {
    // É a regra do negócio: um rateio pela receita e outro por colaboradores
    // convivem, porque o método se escolhe pela natureza da despesa.
    const dois = [r('2026-01-01', '2026-12-31'), r('2026-06-01', '2026-08-31')];
    expect(vigentesEm(dois, '2026-07-15')).toHaveLength(2);
  });
});

describe('ratearValor', () => {
  it('divide em centavos: as parcelas somam o total, não 99,99', () => {
    // Três ajustes iguais dão 33,333…%. Aplicar os 33,33% exibidos devolveria
    // R$ 99,99 — e o centavo sumiria justamente do pagamento, que tem de
    // fechar com o extrato.
    const p = ratearValor(100, [
      { ajusteId: id(1), base: 1 },
      { ajusteId: id(2), base: 1 },
      { ajusteId: id(3), base: 1 },
    ]);
    expect(p.reduce((s, x) => s + x.valor, 0)).toBeCloseTo(100, 2);
    expect(p.filter((x) => x.valor === 33.34)).toHaveLength(1);
  });

  it('o recurso próprio da entidade encolhe a fatia das parcerias', () => {
    // O caso real: convênios de R$ 1,5 mi e R$ 500 mil com R$ 500 mil de
    // receita própria. Sem a linha própria o rateio seria 75/25, e a nota de
    // R$ 1.000,00 debitaria R$ 750,00 ao convênio maior — R$ 150,00 a mais do
    // que lhe cabe, entrando na prestação como despesa da parceria.
    const p = ratearValor(1000, [
      { ajusteId: id(1), base: 1_500_000 },
      { ajusteId: id(2), base: 500_000 },
      { ajusteId: null, base: 500_000 },
    ]);
    expect(p.map((x) => x.valor)).toEqual([600, 200, 200]);
    expect(p.map((x) => x.percentual)).toEqual([60, 20, 20]);
  });

  it('casa por posição: duas origens próprias não colidem no id nulo', () => {
    const p = ratearValor(300, [
      { ajusteId: id(1), base: 100 },
      { ajusteId: null, base: 200 },
      { ajusteId: null, base: 300 },
    ]);
    expect(p.map((x) => x.valor)).toEqual([50, 100, 150]);
  });

  it('sem base divide igualmente — o mesmo critério do quadro', () => {
    const p = ratearValor(90, [
      { ajusteId: id(1), base: 0 },
      { ajusteId: id(2), base: 0 },
      { ajusteId: id(3), base: 0 },
    ]);
    expect(p.map((x) => x.valor)).toEqual([30, 30, 30]);
  });

  it('quadro vazio não devolve parcela nenhuma', () => {
    expect(ratearValor(100, [])).toEqual([]);
  });
});

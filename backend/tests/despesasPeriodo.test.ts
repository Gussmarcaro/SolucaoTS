import { describe, expect, it } from 'vitest';
import { despesasDoPeriodo, type DespesaBruta } from '../src/core/relatorio/despesasPeriodo';

/**
 * Os três quadros de despesa do período — **sem banco**.
 *
 * O número daqui vai para documento assinado pelo dirigente e para o anexo do
 * Tribunal, e erra em silêncio: ninguém confere R$ 1.996,36 à mão contra
 * sessenta notas. Os casos abaixo são os que separam as quatro colunas do
 * anexo (H, I, J e "a pagar") — a nota de dezembro paga em janeiro é o
 * exemplo que o próprio formulário do TCESP usa para justificá-las.
 */

const JUNHO = { de: '2026-06-01', ate: '2026-06-30' };

const nota = (over: Partial<DespesaBruta>): DespesaBruta => ({
  id: 'n1',
  dataEmissao: '2026-06-10',
  valorContabil: 1000,
  pagamentos: [],
  ...over,
});

describe('despesasDoPeriodo', () => {
  it('nota emitida e paga no período entra nos três quadros certos', () => {
    const r = despesasDoPeriodo(
      [nota({ pagamentos: [{ data: '2026-06-20', valor: 1000, codigoExtrato: 'FIT1' }] })],
      JUNHO,
    );
    expect(r.contabilizadas).toHaveLength(1);
    expect(r.pagas).toHaveLength(1);
    expect(r.naoPagas).toHaveLength(0);
    expect(r.totais.contabilizado).toBe(1000);
    expect(r.totais.contabilizadoEPagoNoPeriodo).toBe(1000);
    expect(r.totais.anterioresPagasNoPeriodo).toBe(0);
    expect(r.totais.aPagar).toBe(0);
  });

  it('nota emitida no período e não paga é "a pagar", e não entra em pagas', () => {
    const r = despesasDoPeriodo([nota({})], JUNHO);
    expect(r.contabilizadas).toHaveLength(1);
    expect(r.naoPagas).toHaveLength(1);
    expect(r.pagas).toHaveLength(0);
    expect(r.totais.aPagar).toBe(1000);
    expect(r.totais.pagoNoPeriodo).toBe(0);
  });

  it('nota anterior paga no período é (H): sai no quadro de pagas, não no de contabilizadas', () => {
    // O caso que o próprio anexo cita: despesa de dezembro quitada em janeiro.
    const r = despesasDoPeriodo(
      [
        nota({
          dataEmissao: '2026-05-28',
          pagamentos: [{ data: '2026-06-05', valor: 1000, codigoExtrato: null }],
        }),
      ],
      JUNHO,
    );
    expect(r.contabilizadas).toHaveLength(0);
    expect(r.pagas).toHaveLength(1);
    expect(r.totais.contabilizado).toBe(0);
    expect(r.totais.anterioresPagasNoPeriodo).toBe(1000);
    expect(r.totais.contabilizadoEPagoNoPeriodo).toBe(0);
    expect(r.totais.pagoNoPeriodo).toBe(1000);
  });

  it('J = H + I, sempre', () => {
    const r = despesasDoPeriodo(
      [
        nota({ id: 'a', dataEmissao: '2026-05-10', pagamentos: [{ data: '2026-06-02', valor: 300, codigoExtrato: null }] }),
        nota({ id: 'b', dataEmissao: '2026-06-10', pagamentos: [{ data: '2026-06-15', valor: 700, codigoExtrato: null }] }),
      ],
      JUNHO,
    );
    expect(r.totais.pagoNoPeriodo).toBe(
      r.totais.anterioresPagasNoPeriodo + r.totais.contabilizadoEPagoNoPeriodo,
    );
    expect(r.totais.pagoNoPeriodo).toBe(1000);
  });

  it('pagamento parcial aparece nos dois: pago o que saiu, a pagar o que falta', () => {
    const r = despesasDoPeriodo(
      [nota({ pagamentos: [{ data: '2026-06-20', valor: 400, codigoExtrato: null }] })],
      JUNHO,
    );
    expect(r.totais.pagoNoPeriodo).toBe(400);
    expect(r.totais.aPagar).toBe(600);
    expect(r.naoPagas[0].aPagar).toBe(600);
  });

  it('pagamento posterior ao período não apaga a dívida do fechamento', () => {
    /*
     * É a regra que faz o quadro ser reproduzível: relido em dezembro, o
     * fechamento de junho precisa dar o mesmo número que deu em junho. Olhar
     * "quanto falta hoje" faria o documento assinado deixar de bater com o
     * sistema sem ninguém ter mexido em nada.
     */
    const r = despesasDoPeriodo(
      [nota({ pagamentos: [{ data: '2026-07-05', valor: 1000, codigoExtrato: null }] })],
      JUNHO,
    );
    expect(r.totais.aPagar).toBe(1000);
    expect(r.totais.pagoNoPeriodo).toBe(0);
    expect(r.pagas).toHaveLength(0);
  });

  it('o valor contábil é a parcela do rateio, não a nota inteira', () => {
    // Somar o valor cheio em cada parceria do quadro contaria a mesma despesa
    // duas vezes — o erro que o rateio existe para impedir.
    const r = despesasDoPeriodo([nota({ valorContabil: 750 })], JUNHO);
    expect(r.totais.contabilizado).toBe(750);
    expect(r.totais.aPagar).toBe(750);
  });

  it('as datas de fronteira entram (período inclusivo nos dois extremos)', () => {
    const r = despesasDoPeriodo(
      [
        nota({ id: 'a', dataEmissao: '2026-06-01' }),
        nota({ id: 'b', dataEmissao: '2026-06-30' }),
        nota({ id: 'c', dataEmissao: '2026-05-31' }),
        nota({ id: 'd', dataEmissao: '2026-07-01' }),
      ],
      JUNHO,
    );
    expect(r.contabilizadas.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('o código do extrato chega ao quadro de comprovantes', () => {
    const r = despesasDoPeriodo(
      [nota({ pagamentos: [{ data: '2026-06-20', valor: 1000, codigoExtrato: 'FIT-9' }] })],
      JUNHO,
    );
    expect(r.pagas[0].pagamentos[0].codigoExtrato).toBe('FIT-9');
  });

  it('pagamento a mais não vira saldo negativo', () => {
    const r = despesasDoPeriodo(
      [nota({ pagamentos: [{ data: '2026-06-20', valor: 1200, codigoExtrato: null }] })],
      JUNHO,
    );
    expect(r.totais.aPagar).toBe(0);
    expect(r.naoPagas).toHaveLength(0);
  });

  it('sem nota nenhuma, todos os totais são zero — nunca NaN', () => {
    const r = despesasDoPeriodo([], JUNHO);
    expect(Object.values(r.totais).every((v) => v === 0)).toBe(true);
  });
});

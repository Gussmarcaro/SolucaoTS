import { describe, expect, it } from 'vitest';
import { conferirTotalDoPlano } from './totalDoPlano';

/**
 * O espelho da conferência do Plano de Aplicação.
 *
 * Mesmos números de `npm run verificar:plano`. Divergindo, a tela diz que o
 * plano fecha e o servidor recusa marcar o ajuste como Enviado — numa mensagem
 * sobre um número que a tela nunca mostrou.
 */
describe('total do plano contra o valor do ajuste', () => {
  it('pega o mensal somado como se fosse anual', () => {
    // O erro real: plano de R$ 12 mi num ajuste de R$ 1,5 mi — o mensal
    // multiplicado pelas oito competências do exercício.
    const c = conferirTotalDoPlano(12_000_000, 1_500_000);
    expect(c.situacao).toBe('A_MAIOR');
    expect(c.diferenca).toBe(10_500_000);
  });

  it('plano igual confere', () => {
    expect(conferirTotalDoPlano(1_500_000, 1_500_000).confere).toBe(true);
  });

  it('meio centavo de folga não reprova', () => {
    // O total sai de somas de Decimal; reprovar por ponto flutuante barraria
    // plano correto.
    expect(conferirTotalDoPlano(1_500_000.004, 1_500_000).confere).toBe(true);
    expect(conferirTotalDoPlano(1_500_000.01, 1_500_000).confere).toBe(false);
  });

  it('plano vazio é SEM_PLANO, não A_MENOR', () => {
    expect(conferirTotalDoPlano(0, 1_500_000).situacao).toBe('SEM_PLANO');
  });

  it('entrada não-finita não vira acusação de gastar demais', () => {
    expect(conferirTotalDoPlano(NaN, 1_500_000).situacao).toBe('SEM_PLANO');
  });
});

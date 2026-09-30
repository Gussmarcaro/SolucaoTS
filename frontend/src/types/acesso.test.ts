import { describe, expect, it } from 'vitest';
import { formatarDuracao, hojeLocal, SITUACAO_LABEL, SITUACAO_TONE } from './acesso';

/**
 * O espelho do histórico de acessos.
 *
 * Só a apresentação é espelhada — a situação e a permanência vêm do servidor,
 * de propósito (ver o comentário em `acesso.ts`). O que se trava aqui são os
 * mesmos casos de `npm run verificar:sessoes`, com os mesmos números: divergir
 * faria a mesma sessão aparecer como "1h 35min" numa tela e "95min" noutra.
 */
describe('formato da permanência', () => {
  it('reproduz os casos do backend', () => {
    expect(formatarDuracao(95)).toBe('1h 35min');
    expect(formatarDuracao(120)).toBe('2h');
    expect(formatarDuracao(40)).toBe('40min');
  });

  it('zero não vira "0min"', () => {
    // "0min" parece defeito; "menos de 1min" é o que de fato aconteceu.
    expect(formatarDuracao(0)).toBe('menos de 1min');
    expect(formatarDuracao(-5)).toBe('menos de 1min');
  });
});

describe('leitura da situação', () => {
  it('toda situação tem rótulo e cor', () => {
    for (const s of ['ABERTA', 'ENCERRADA', 'ENCERRADA_INESPERADAMENTE'] as const) {
      expect(SITUACAO_LABEL[s]).toBeTruthy();
      expect(SITUACAO_TONE[s]).toBeTruthy();
    }
  });

  it('encerrada inesperadamente não é pintada como incidente', () => {
    // Numa aplicação web é o caso comum: fechar a aba não avisa o servidor.
    // Vermelho ali ensinaria a ler como falha o que é o dia a dia.
    expect(SITUACAO_TONE.ENCERRADA_INESPERADAMENTE).toBe('neutral');
    expect(SITUACAO_TONE.ABERTA).toBe('success');
  });
});

describe('o "Hoje" do filtro', () => {
  it('usa o fuso local, não UTC', () => {
    // Às 22h em São Paulo, `toISOString()` já está no dia seguinte: o botão
    // filtraria um dia sem nenhum acesso e a tela abriria vazia.
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    expect(hojeLocal()).toBe(esperado);
  });
});

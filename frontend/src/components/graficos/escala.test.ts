import { describe, expect, it } from 'vitest';
import { emDias, moedaCompacta, normalizar } from './escala';

/**
 * A aritmética dos gráficos.
 *
 * Nada aqui quebra a tela quando erra — é exatamente por isso que está travado.
 * Uma posição mal normalizada desenha a parcela no dia errado e o atraso sai com
 * o comprimento errado; ninguém percebe olhando, porque o gráfico continua
 * bonito.
 */

describe('data em dias, sem deslocamento de fuso', () => {
  it('não anda um dia para trás', () => {
    // O defeito clássico: `new Date('2026-03-01')` é meia-noite UTC e, em São
    // Paulo (UTC-3), `getDate()` devolve 28/02. Aqui o 1º de março tem de ser
    // exatamente um dia depois do último de fevereiro.
    const fev28 = emDias('2026-02-28')!;
    const mar01 = emDias('2026-03-01')!;
    expect(mar01 - fev28).toBe(1);
  });

  it('mede a distância em dias corridos', () => {
    expect(emDias('2026-01-31')! - emDias('2026-01-01')!).toBe(30);
    // Ano bissexto: 2028 tem 29 de fevereiro.
    expect(emDias('2028-03-01')! - emDias('2028-02-01')!).toBe(29);
  });

  it('data ausente ou malformada não vira zero', () => {
    // Zero seria uma data válida (01/01/1970) e colocaria a parcela na
    // extremidade esquerda do eixo como se fosse um fato.
    expect(emDias(null)).toBeNull();
    expect(emDias('')).toBeNull();
    expect(emDias('não é data')).toBeNull();
  });
});

describe('normalização para o eixo', () => {
  it('mapeia início, meio e fim', () => {
    expect(normalizar(0, 0, 10)).toBe(0);
    expect(normalizar(5, 0, 10)).toBe(0.5);
    expect(normalizar(10, 0, 10)).toBe(1);
  });

  it('janela de largura zero devolve 0, nunca NaN', () => {
    // Acontece de verdade: todas as parcelas no mesmo dia. `NaN` viraria
    // `left: NaN%`, que o navegador descarta **em silêncio** — os pontos
    // empilhariam à esquerda sem nenhum erro no console.
    expect(normalizar(5, 5, 5)).toBe(0);
    expect(Number.isNaN(normalizar(5, 5, 5))).toBe(false);
  });

  it('prende o valor dentro do quadro', () => {
    // Fora de 0..1 a marca sairia desenhada fora da área do gráfico.
    expect(normalizar(-10, 0, 10)).toBe(0);
    expect(normalizar(999, 0, 10)).toBe(1);
  });
});

describe('moeda compacta', () => {
  it('encurta o que não caberia ao lado da barra', () => {
    expect(moedaCompacta(1_284_000)).toBe('R$ 1,3 mi');
    expect(moedaCompacta(340_000)).toBe('R$ 340 mil');
    expect(moedaCompacta(850)).toBe('R$ 850');
  });

  it('negativo mantém o sinal', () => {
    // "Em poder da OSC" negativo significa que a entidade pagou mais do que
    // recebeu — perder o sinal inverteria a leitura.
    expect(moedaCompacta(-1_200_000)).toBe('R$ -1,2 mi');
  });
});

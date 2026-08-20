import { describe, expect, it } from 'vitest';
import {
  deslocar,
  podeArrastar,
  podeExcluir,
  DURACAO_MINIMA,
  type Compromisso,
} from './compromisso';

/**
 * Aritmética do arrasto na agenda — o erro aqui é silencioso.
 *
 * Remarcar arrastando não devolve confirmação: o bloco vai para o lugar novo e
 * o usuário acredita nele. Uma conta errada aqui não quebra tela nenhuma — ela
 * grava a reunião numa hora que ninguém escolheu, e só aparece quando alguém
 * chega ao lugar errado.
 *
 * `podeArrastar` é a outra metade, e está escrita **duas vezes**: aqui e em
 * `core/compromisso/Compromisso.ts`, no backend. Divergir significa oferecer um
 * gesto que o servidor vai recusar (ou, pior, não oferecer o que ele aceita).
 */

const base = (over: Partial<Compromisso> = {}): Pick<Compromisso, 'inicioEm' | 'fimEm'> => ({
  inicioEm: '2026-09-15T14:00:00.000Z',
  fimEm: '2026-09-15T15:30:00.000Z',
  ...over,
});

/** Minutos entre os dois instantes — a duração, que mover não pode alterar. */
const duracao = (r: { inicioEm: Date; fimEm: Date }) =>
  (r.fimEm.getTime() - r.inicioEm.getTime()) / 60_000;

describe('deslocar', () => {
  it('mover preserva a duração', () => {
    const r = deslocar(base(), { dias: 2, minutos: 30 });
    expect(duracao(r)).toBe(90);
  });

  it('mover no eixo dos dias mantém a hora', () => {
    const c = base({ inicioEm: '2026-09-15T14:00:00.000Z' });
    const r = deslocar(c, { dias: 3 });
    expect(r.inicioEm.getHours()).toBe(new Date(c.inicioEm).getHours());
    expect(r.inicioEm.getMinutes()).toBe(new Date(c.inicioEm).getMinutes());
    expect(r.inicioEm.getDate()).toBe(new Date(c.inicioEm).getDate() + 3);
  });

  it('mover para trás também preserva a duração', () => {
    const r = deslocar(base(), { dias: -1, minutos: -45 });
    expect(duracao(r)).toBe(90);
  });

  /**
   * O horário de verão foi extinto no Brasil, mas a agenda guarda ISO e o
   * usuário pode estar noutro fuso. Somar dias pelo calendário (`setDate`), e
   * não 24h em milissegundos, é o que mantém "toda quinta às 14h" às 14h.
   */
  it('atravessa a virada do mês sem perder o dia', () => {
    const r = deslocar(base({ inicioEm: '2026-09-30T14:00:00.000Z', fimEm: '2026-09-30T15:00:00.000Z' }), {
      dias: 1,
    });
    expect(r.inicioEm.getMonth()).toBe(9); // outubro
    expect(r.inicioEm.getDate()).toBe(1);
  });

  it('redimensionar mexe só no fim', () => {
    const c = base();
    const r = deslocar(c, { minutos: 30, so: 'fim' });
    expect(r.inicioEm.toISOString()).toBe(c.inicioEm);
    expect(duracao(r)).toBe(120);
  });

  it('redimensionar não encolhe abaixo do mínimo', () => {
    // Arrastar a borda de baixo para cima do início inverteria o compromisso —
    // e um bloco de altura zero some da grade, sem como pegá-lo de volta.
    const r = deslocar(base(), { minutos: -600, so: 'fim' });
    expect(duracao(r)).toBe(DURACAO_MINIMA);
    expect(r.fimEm.getTime()).toBeGreaterThan(r.inicioEm.getTime());
  });

  it('sem deslocamento, nada muda', () => {
    const c = base();
    const r = deslocar(c, {});
    expect(r.inicioEm.toISOString()).toBe(c.inicioEm);
    expect(r.fimEm.toISOString()).toBe(c.fimEm);
  });
});

/**
 * `podeExcluir` decide se o botão de excluir aparece — e a mesma regra existe
 * em `core/compromisso/visibilidade.ts`, no backend, que é quem de fato barra.
 *
 * Errar aqui não quebra tela nenhuma nos dois sentidos, e os dois são ruins:
 * para menos, o dono não consegue apagar o que criou e conclui que o sistema
 * travou; para mais, a tela oferece um botão que devolve 403.
 */
describe('podeExcluir', () => {
  const EU = 'u-1';
  const c = (over: Partial<Pick<Compromisso, 'criadoPor' | 'visibilidade'>> = {}) => ({
    criadoPor: 'u-outro',
    visibilidade: 'ORGAO' as const,
    ...over,
  });

  it('o criador exclui o que criou, sem faixa Total', () => {
    expect(podeExcluir(c({ criadoPor: EU }), EU, false)).toBe(true);
  });

  it('o criador exclui o próprio particular', () => {
    expect(podeExcluir(c({ criadoPor: EU, visibilidade: 'PARTICULAR' }), EU, false)).toBe(true);
  });

  it('quem não criou precisa de faixa Total', () => {
    expect(podeExcluir(c(), EU, false)).toBe(false);
    expect(podeExcluir(c(), EU, true)).toBe(true);
  });

  it('nem a faixa Total alcança o particular de outra pessoa', () => {
    expect(podeExcluir(c({ visibilidade: 'PARTICULAR' }), EU, true)).toBe(false);
  });

  it('sem criador registrado ninguém vira dono por omissão', () => {
    expect(podeExcluir(c({ criadoPor: null }), EU, false)).toBe(false);
    expect(podeExcluir(c({ criadoPor: null }), EU, true)).toBe(true);
  });

  it('usuário desconhecido não casa com criador nulo', () => {
    // `undefined === null` é falso, mas a comparação passa por `c.criadoPor &&`
    // justamente para o par (nulo, indefinido) não virar "sou o dono".
    expect(podeExcluir(c({ criadoPor: null }), undefined, false)).toBe(false);
  });
});

describe('podeArrastar', () => {
  it('agendado e sem repetição pode', () => {
    expect(podeArrastar({ status: 'AGENDADO', recorrencia: 'NAO_REPETE' })).toBe(true);
  });

  it('série recorrente não pode — mover uma ocorrência mudaria a série', () => {
    for (const recorrencia of ['DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL'] as const)
      expect(podeArrastar({ status: 'AGENDADO', recorrencia })).toBe(false);
  });

  it('realizado e cancelado não podem', () => {
    expect(podeArrastar({ status: 'REALIZADO', recorrencia: 'NAO_REPETE' })).toBe(false);
    expect(podeArrastar({ status: 'CANCELADO', recorrencia: 'NAO_REPETE' })).toBe(false);
  });
});

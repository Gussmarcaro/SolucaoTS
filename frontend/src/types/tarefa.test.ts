import { afterEach, describe, expect, it, vi } from 'vitest';
import { diasAte, rotuloPrazo, situacaoPrazo, type Tarefa } from './tarefa';

/**
 * Regra de prazo das tarefas — **duplicada de propósito, e por isso testada**.
 *
 * A mesma regra existe duas vezes: aqui e em `core/tarefa/Tarefa.ts`, no
 * backend. Elas podem divergir sem nada quebrar — a grade diria "em dia" e o
 * servidor consideraria atrasada, e ninguém perceberia até alguém perder um
 * prazo do TCESP.
 *
 * Os limiares abaixo são os mesmos do backend. Se um dos lados mudar, este
 * arquivo é o lugar onde a divergência aparece.
 */

const HOJE = new Date('2026-08-19T10:00:00-03:00');

function tarefa(prazoLegal: string, status: Tarefa['status'] = 'PENDENTE'): Tarefa {
  return {
    id: 't1',
    titulo: 'Renovar CND',
    descricao: null,
    prioridade: 'MEDIA',
    status,
    prazoLegal,
    ajusteId: null,
    ajusteCodigo: null,
    entidadeNome: null,
    responsavelId: null,
    responsavelNome: null,
    origemAlerta: null,
    concluidaEm: null,
    criadoPor: null,
    criadoEm: '',
    atualizadoEm: '',
  };
}

afterEach(() => vi.useRealTimers());

function fixarHoje() {
  vi.useFakeTimers();
  vi.setSystemTime(HOJE);
}

describe('dias até o prazo', () => {
  it('conta pelo dia do calendário, não pelas 24 horas', () => {
    fixarHoje();
    // Às 10h de hoje, "amanhã" é 1 — não 0 porque faltam menos de 24h.
    expect(diasAte('2026-08-19')).toBe(0);
    expect(diasAte('2026-08-20')).toBe(1);
    expect(diasAte('2026-08-18')).toBe(-1);
  });

  it('atravessa a virada do mês', () => {
    fixarHoje();
    expect(diasAte('2026-09-01')).toBe(13);
  });
});

describe('situação do prazo', () => {
  it('vencida e aberta é ATRASADA', () => {
    fixarHoje();
    expect(situacaoPrazo(tarefa('2026-08-18'))).toBe('ATRASADA');
    expect(situacaoPrazo(tarefa('2026-08-18', 'EM_ANDAMENTO'))).toBe('ATRASADA');
  });

  it('vence hoje é HOJE', () => {
    fixarHoje();
    expect(situacaoPrazo(tarefa('2026-08-19'))).toBe('HOJE');
  });

  it('o limiar de 7 dias é inclusivo', () => {
    fixarHoje();
    // O ponto exato onde os dois lados poderiam divergir por um dia.
    expect(situacaoPrazo(tarefa('2026-08-26'))).toBe('PROXIMA'); // +7
    expect(situacaoPrazo(tarefa('2026-08-27'))).toBe('EM_DIA'); // +8
  });

  it('encerrada não é atrasada, por mais vencida que esteja', () => {
    fixarHoje();
    // O prazo parou de correr quando a providência foi tomada (ou descartada).
    expect(situacaoPrazo(tarefa('2020-01-01', 'CONCLUIDA'))).toBe('ENCERRADA');
    expect(situacaoPrazo(tarefa('2020-01-01', 'CANCELADA'))).toBe('ENCERRADA');
  });
});

describe('rótulo do prazo', () => {
  it('diz há quantos dias está atrasada', () => {
    fixarHoje();
    expect(rotuloPrazo(tarefa('2026-08-16'))).toBe('atrasada há 3d');
  });

  it('diz quando vence hoje e quando falta', () => {
    fixarHoje();
    expect(rotuloPrazo(tarefa('2026-08-19'))).toBe('vence hoje');
    expect(rotuloPrazo(tarefa('2026-08-24'))).toBe('em 5d');
  });

  it('encerrada mostra o estado, não o prazo', () => {
    fixarHoje();
    expect(rotuloPrazo(tarefa('2020-01-01', 'CONCLUIDA'))).toBe('Concluída');
    expect(rotuloPrazo(tarefa('2020-01-01', 'CANCELADA'))).toBe('Cancelada');
  });
});

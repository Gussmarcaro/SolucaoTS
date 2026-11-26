import { describe, expect, it } from 'vitest';
import { conferirNegativa, montarDeclaracaoNegativa, type DadosNegativa } from '../src/application/montador/montarNegativa';
import { negativasDoExercicio, type AjusteParaNegativa } from '../src/core/declaracaoNegativa/negativaPrestacao';
import { AjvValidadorSchema } from '../src/infrastructure/tcesp/AjvValidadorSchema';

const dados = (extra: Partial<DadosNegativa> = {}): DadosNegativa => ({
  ano: 2025,
  tipoAjuste: 'CONVENIO',
  codigoAjuste: '2023000000000001',
  municipio: 7107,
  entidade: 10048,
  dataAssinatura: '2025-03-10',
  empenhosNoAno: 0,
  repassesLancados: 0,
  ...extra,
});

describe('JSON da Declaração Negativa da prestação', () => {
  it('é igual ao exemplo do manual (§36) e passa no schema oficial', () => {
    const { documento, erros } = montarDeclaracaoNegativa(dados());
    expect(erros).toEqual([]);
    expect(documento).toEqual({
      descritor: {
        tipo_documento: 'Prestação de Contas de Convênio',
        municipio: 7107,
        entidade: 10048,
        ano: 2025,
        mes: 12,
      },
      codigo_ajuste: '2023000000000001',
    });
    const s = new AjvValidadorSchema().validar('DECLARACAO_NEGATIVA', documento);
    expect(s).toEqual({ validado: true, erros: [] });
  });

  it('sem os códigos do órgão: erro antes de transmitir, e o schema também recusa', () => {
    const { documento, erros } = montarDeclaracaoNegativa(dados({ municipio: null, entidade: null }));
    expect(erros[0]).toMatch(/município\/entidade/);
    expect(new AjvValidadorSchema().validar('DECLARACAO_NEGATIVA', documento).erros.length).toBeGreaterThan(0);
  });
});

describe('conferência da negativa', () => {
  it('exercício anterior à assinatura impede', () => {
    expect(conferirNegativa(dados({ ano: 2024 }))[0]).toMatchObject({ severidade: 'IMPEDE' });
  });

  it('repasse lançado impede; empenho no ano pede atenção', () => {
    const p = conferirNegativa(dados({ repassesLancados: 2, empenhosNoAno: 1 }));
    expect(p.map((x) => x.severidade)).toEqual(['IMPEDE', 'ATENCAO']);
  });

  it('ajuste do ano, sem repasse nem empenho: nada a apontar', () => {
    expect(conferirNegativa(dados())).toEqual([]);
  });
});

const ajuste = (extra: Partial<AjusteParaNegativa>): AjusteParaNegativa => ({
  ajusteId: 'a',
  codigoAjuste: 'A',
  tipoAjuste: 'CONVENIO',
  entidadeNome: 'OSC',
  dataAssinatura: '2025-05-01',
  vigenciaFinal: null,
  anosComPrestacao: [],
  negativaNoAno: null,
  prestacaoNoAnoId: null,
  empenhosNoAno: 0,
  ...extra,
});

describe('sugestão de negativas do exercício', () => {
  it('sugere o ajuste do ano sem empenho e separa o que tem empenho', () => {
    const l = negativasDoExercicio(
      [
        ajuste({ ajusteId: 'sem', codigoAjuste: 'S' }),
        ajuste({ ajusteId: 'com', codigoAjuste: 'C', empenhosNoAno: 3 }),
      ],
      2025,
    );
    expect(l.map((x) => [x.ajusteId, x.situacao])).toEqual([
      ['sem', 'SUGERIDA'],
      ['com', 'COM_EMPENHO'],
    ]);
  });

  it('fora: assinado depois, vigência encerrada antes, e exercício não inicial', () => {
    const l = negativasDoExercicio(
      [
        ajuste({ ajusteId: 'depois', dataAssinatura: '2026-01-10' }),
        ajuste({ ajusteId: 'vencido', dataAssinatura: '2023-07-01', vigenciaFinal: '2024-06-30' }),
        ajuste({ ajusteId: 'jaPrestou', dataAssinatura: '2023-07-01', anosComPrestacao: [2024] }),
      ],
      2025,
    );
    expect(l).toEqual([]);
  });

  it('mostra a negativa e a prestação já existentes', () => {
    const l = negativasDoExercicio(
      [
        ajuste({ ajusteId: 'n', negativaNoAno: { prestacaoId: 'p1', status: 'ARMAZENADO' } }),
        ajuste({ ajusteId: 'p', prestacaoNoAnoId: 'p2', anosComPrestacao: [2025] }),
      ],
      2025,
    );
    expect(l.map((x) => [x.ajusteId, x.situacao, x.prestacaoId])).toEqual([
      ['n', 'NEGATIVA', 'p1'],
      ['p', 'PRESTACAO', 'p2'],
    ]);
  });
});

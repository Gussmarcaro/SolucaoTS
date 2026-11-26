import { describe, expect, it } from 'vitest';
import { copiaPodeAcompanhar, totalAtualizavel } from '../src/core/fornecedor/propagacaoNome';

describe('copiaPodeAcompanhar — o nome novo do fornecedor chega à cópia?', () => {
  it('nota ainda sem prestação acompanha', () => {
    expect(copiaPodeAcompanhar([])).toBe(true);
  });

  it('só em prestações em elaboração, acompanha', () => {
    expect(copiaPodeAcompanhar(['EM_ELABORACAO', 'EM_ELABORACAO'])).toBe(true);
  });

  it('uma prestação transmitida basta para travar — o nome antigo já foi ao TCESP', () => {
    for (const s of ['ENVIADO', 'ARMAZENADO', 'REJEITADO', 'SUBSTITUIDO'])
      expect(copiaPodeAcompanhar(['EM_ELABORACAO', s])).toBe(false);
  });
});

describe('totalAtualizavel', () => {
  it('soma notas, contratos da prestação e contratos do cadastro, sem as travadas', () => {
    expect(
      totalAtualizavel({
        nome: 'X',
        notas: { atualizaveis: 2, travadas: 5 },
        contratosPrestacao: { atualizaveis: 1, travados: 3 },
        contratosCadastro: 1,
      }),
    ).toBe(4);
  });
});

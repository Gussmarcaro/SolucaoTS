import { describe, expect, it } from 'vitest';
import { ATALHOS, atalhosQueCasam } from './atalhos';

const ids = (termo: string) => atalhosQueCasam(ATALHOS, termo).map((a) => a.id);

describe('atalhosQueCasam', () => {
  it('campo vazio lista todas as ações — é o Ctrl+K servindo de menu', () => {
    expect(ids('')).toHaveLength(ATALHOS.length);
    expect(ids('   ')).toHaveLength(ATALHOS.length);
  });

  it('casa pelo começo de palavra, e quem casa pelo nome vem primeiro', () => {
    // "desp" também está na descrição do pagamento ("de uma despesa").
    expect(ids('desp')[0]).toBe('despesa');
    expect(ids('desp')).toContain('pagamento');
    expect(ids('pag')[0]).toBe('pagamento');
  });

  it('ignora acento e caixa', () => {
    expect(ids('LANCAR DESP')).toEqual(['despesa']);
    expect(ids('conciliacao')).toContain('extrato');
  });

  it('acha pelos sinônimos que o usuário de fato digita', () => {
    expect(ids('nota')).toContain('despesa');
    expect(ids('ofx')).toEqual(['extrato']);
    expect(ids('repasse')).toContain('receita');
    expect(ids('convenio')).toContain('ajuste');
  });

  it('aceita mais de uma palavra em sequência', () => {
    expect(ids('nota fis')).toContain('despesa');
  });

  it('não casa por pedaço do meio da palavra', () => {
    // "eta" está dentro de "meta", mas ninguém digita "eta" querendo metas.
    expect(ids('eta')).not.toContain('meta');
  });

  it('termo sem relação não devolve nada', () => {
    expect(ids('xyzw')).toEqual([]);
  });

  it('todo atalho tem destino interno e nível declarado', () => {
    for (const a of ATALHOS) {
      expect(a.destino.startsWith('/')).toBe(true);
      expect(['CONSULTA', 'EDICAO', 'TOTAL']).toContain(a.nivel);
    }
    expect(new Set(ATALHOS.map((a) => a.id)).size).toBe(ATALHOS.length);
  });
});

import { describe, expect, it } from 'vitest';
import { bloqueioDeEnvio, estaTravada, podeRetificar } from '../src/core/prestacao/trava';
import { RetificarPrestacaoUseCase } from '../src/application/transmissao/RetificarPrestacaoUseCase';
import type { ITransmissaoRepository, PrestacaoParaEnvio } from '../src/application/transmissao/ITransmissaoRepository';

describe('trava da prestação', () => {
  it('só trava depois de envio à produção, enquanto enviada ou armazenada', () => {
    expect(estaTravada({ status: 'ARMAZENADO', enviadaProducao: true })).toBe(true);
    expect(estaTravada({ status: 'ENVIADO', enviadaProducao: true })).toBe(true);
    // Piloto não trava; rejeitada destrava para corrigir.
    expect(estaTravada({ status: 'ARMAZENADO', enviadaProducao: false })).toBe(false);
    expect(estaTravada({ status: 'REJEITADO', enviadaProducao: true })).toBe(false);
    expect(estaTravada({ status: 'EM_ELABORACAO', enviadaProducao: true })).toBe(false);
  });

  it('não reenvia à produção o que já está lá; o piloto é livre', () => {
    expect(bloqueioDeEnvio({ status: 'ARMAZENADO', enviadaProducao: true }, 'PRODUCAO')).toMatch(/retificação/);
    expect(bloqueioDeEnvio({ status: 'ENVIADO', enviadaProducao: true }, 'PRODUCAO')).toMatch(/Consulte o status/);
    expect(bloqueioDeEnvio({ status: 'ARMAZENADO', enviadaProducao: true }, 'PILOTO')).toBeNull();
    expect(bloqueioDeEnvio({ status: 'EM_ELABORACAO', enviadaProducao: true }, 'PRODUCAO')).toBeNull();
  });

  it('retificação só para armazenada na produção', () => {
    expect(podeRetificar({ status: 'ARMAZENADO', enviadaProducao: true })).toBeNull();
    expect(podeRetificar({ status: 'ARMAZENADO', enviadaProducao: false })).not.toBeNull();
    expect(podeRetificar({ status: 'REJEITADO', enviadaProducao: true })).not.toBeNull();
  });
});

function repo(p: Partial<PrestacaoParaEnvio>, posteriores: number[] = []) {
  const reaberturas: unknown[] = [];
  const r = {
    async carregar() {
      return { id: 'p', ajusteId: 'a', ano: 2025, tipoAjuste: 'CONVENIO', status: 'ARMAZENADO', declaracaoNegativa: false, ehRetificacao: false, enviadaProducao: true, ...p };
    },
    async posterioresArmazenadas() {
      return posteriores;
    },
    async reabrir(_id: string, marcas: unknown) {
      reaberturas.push(marcas);
    },
  } as unknown as ITransmissaoRepository;
  return { r, reaberturas };
}

describe('RetificarPrestacaoUseCase', () => {
  it('prestação comum vira retificação', async () => {
    const { r, reaberturas } = repo({});
    expect(await new RetificarPrestacaoUseCase(r).confirmar('p', false)).toEqual({ acao: 'RETIFICAR', posteriores: [] });
    expect(reaberturas).toEqual([{ declaracaoNegativa: false, ehRetificacao: true }]);
  });

  it('com exercícios posteriores armazenados, exige ciência', async () => {
    const { r, reaberturas } = repo({}, [2026]);
    await expect(new RetificarPrestacaoUseCase(r).confirmar('p', false)).rejects.toThrow(/2026/);
    expect(reaberturas).toEqual([]);
    await new RetificarPrestacaoUseCase(r).confirmar('p', true);
    expect(reaberturas).toHaveLength(1);
  });

  it('negativa vira prestação; só vai como retificação se houver posterior', async () => {
    const a = repo({ declaracaoNegativa: true });
    expect((await new RetificarPrestacaoUseCase(a.r).confirmar('p', false)).acao).toBe('CONVERTER_NEGATIVA');
    expect(a.reaberturas).toEqual([{ declaracaoNegativa: false, ehRetificacao: false }]);
    const b = repo({ declaracaoNegativa: true }, [2026]);
    await new RetificarPrestacaoUseCase(b.r).confirmar('p', true);
    expect(b.reaberturas).toEqual([{ declaracaoNegativa: false, ehRetificacao: true }]);
  });

  it('recusa o que não está armazenado na produção', async () => {
    await expect(new RetificarPrestacaoUseCase(repo({ status: 'ENVIADO' }).r).prever('p')).rejects.toThrow(/armazenada/);
  });
});

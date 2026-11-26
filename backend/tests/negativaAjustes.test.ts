import { describe, expect, it } from 'vitest';
import {
  periodosDoAno,
  situacaoDoPeriodo,
  tiposPendentes,
  ultimoPeriodoEncerrado,
  type AjusteAssinado,
} from '../src/core/declaracaoNegativa/negativaAjustes';
import {
  NegativaAjusteUseCases,
  type INegativaAjusteRepository,
  type NegativaGravada,
} from '../src/application/declaracaoNegativa/NegativaAjusteUseCases';
import { ListarAlertasUseCase, type DadosAlertas } from '../src/application/alerta/ListarAlertasUseCase';

describe('períodos da negativa', () => {
  it('quadrimestral: três períodos, prazo de 5 dias úteis', () => {
    const [q1, q2, q3] = periodosDoAno('QUADRIMESTRAL', 2026);
    expect([q1.inicio, q1.fim]).toEqual(['2026-01-01', '2026-04-30']);
    expect([q2.inicio, q2.fim]).toEqual(['2026-05-01', '2026-08-31']);
    expect([q3.inicio, q3.fim]).toEqual(['2026-09-01', '2026-12-31']);
    // 30/04/2026 é quinta: sex 1, seg 4, ter 5, qua 6, qui 7.
    expect(q1.prazo).toBe('2026-05-07');
  });

  it('anual: o exercício, prazo de 15 dias úteis', () => {
    const [a] = periodosDoAno('ANUAL', 2025);
    expect(a).toMatchObject({ periodo: 0, inicio: '2025-01-01', fim: '2025-12-31' });
    expect(a.prazo).toBe('2026-01-21');
  });

  it('último período encerrado', () => {
    expect(ultimoPeriodoEncerrado('QUADRIMESTRAL', '2026-11-26')).toMatchObject({ ano: 2026, periodo: 2 });
    expect(ultimoPeriodoEncerrado('QUADRIMESTRAL', '2026-02-10')).toMatchObject({ ano: 2025, periodo: 3 });
    expect(ultimoPeriodoEncerrado('ANUAL', '2026-11-26')).toMatchObject({ ano: 2025, periodo: 0 });
  });
});

const ajuste = (tipoAjuste: AjusteAssinado['tipoAjuste'], dataAssinatura: string): AjusteAssinado => ({
  tipoAjuste,
  codigoAjuste: `C-${dataAssinatura}`,
  dataAssinatura,
  enviado: true,
});

describe('situação por tipo', () => {
  const q2 = periodosDoAno('QUADRIMESTRAL', 2026)[1];

  it('tipo assinado no período não se declara; os outros ficam pendentes', () => {
    const linhas = situacaoDoPeriodo(
      q2,
      [ajuste('TERMO_COLABORACAO', '2026-06-10'), ajuste('CONVENIO', '2026-03-01')],
      [{ tipoAjuste: 'TERMO_FOMENTO', declaradaEm: '2026-09-03' }],
      '2026-11-26',
    );
    const estado = Object.fromEntries(linhas.map((l) => [l.tipoAjuste, l.estado]));
    expect(estado).toEqual({
      CONTRATO_GESTAO: 'PENDENTE',
      // O convênio é de março, fora do 2º quadrimestre.
      CONVENIO: 'PENDENTE',
      TERMO_COLABORACAO: 'ASSINADO',
      TERMO_FOMENTO: 'DECLARADA',
      TERMO_PARCERIA: 'PENDENTE',
    });
    expect(tiposPendentes(linhas)).toEqual(['CONTRATO_GESTAO', 'CONVENIO', 'TERMO_PARCERIA']);
  });

  it('período em andamento não é cobrado', () => {
    const q3 = periodosDoAno('QUADRIMESTRAL', 2026)[2];
    const linhas = situacaoDoPeriodo(q3, [], [], '2026-11-26');
    expect(linhas.every((l) => l.estado === 'EM_ANDAMENTO')).toBe(true);
    expect(tiposPendentes(linhas)).toEqual([]);
  });

  it('ajuste assinado depois de marcada a negativa prevalece', () => {
    const linhas = situacaoDoPeriodo(
      q2,
      [ajuste('CONVENIO', '2026-08-20')],
      [{ tipoAjuste: 'CONVENIO', declaradaEm: '2026-08-10' }],
      '2026-11-26',
    );
    expect(linhas.find((l) => l.tipoAjuste === 'CONVENIO')!.estado).toBe('ASSINADO');
  });
});

function repo(inicial: { ajustes?: AjusteAssinado[]; periodicidade?: 'QUADRIMESTRAL' | 'ANUAL' | null } = {}) {
  const gravadas: (NegativaGravada & { clienteId: string; ano: number })[] = [];
  let seq = 0;
  const r: INegativaAjusteRepository = {
    async periodicidade() {
      return inicial.periodicidade === undefined ? 'QUADRIMESTRAL' : inicial.periodicidade;
    },
    async ajustesAssinados(_c, de, ate) {
      return (inicial.ajustes ?? []).filter((a) => a.dataAssinatura >= de && a.dataAssinatura <= ate);
    },
    async declaradas(c, ano) {
      return gravadas.filter((g) => g.clienteId === c && g.ano === ano);
    },
    async marcar(c, ano, periodo, tipos, data) {
      for (const tipoAjuste of tipos) {
        const ja = gravadas.find((g) => g.clienteId === c && g.ano === ano && g.periodo === periodo && g.tipoAjuste === tipoAjuste);
        const declaradaEm = data.toISOString().slice(0, 10);
        if (ja) ja.declaradaEm = declaradaEm;
        else gravadas.push({ id: `n${++seq}`, clienteId: c, ano, periodo, tipoAjuste, declaradaEm });
      }
    },
    async desmarcar(c, id) {
      const i = gravadas.findIndex((g) => g.id === id && g.clienteId === c);
      if (i < 0) return false;
      gravadas.splice(i, 1);
      return true;
    },
  };
  return { r, gravadas };
}

describe('NegativaAjusteUseCases', () => {
  const hoje = () => '2026-11-26';

  it('exige órgão selecionado', async () => {
    await expect(new NegativaAjusteUseCases(repo().r, hoje).painel(null, 2026)).rejects.toThrow(/Selecione um órgão/);
  });

  it('exige periodicidade no cadastro do órgão', async () => {
    const casos = new NegativaAjusteUseCases(repo({ periodicidade: null }).r, hoje);
    await expect(casos.painel('o1', 2026)).rejects.toThrow(/periodicidade/);
  });

  it('marca, mostra como declarada e desmarca', async () => {
    const { r } = repo();
    const casos = new NegativaAjusteUseCases(r, hoje);
    await casos.marcar('o1', { ano: 2026, periodo: 2, tipos: ['CONVENIO', 'TERMO_FOMENTO'], declaradaEm: '2026-09-04' });

    const p = (await casos.painel('o1', 2026)).periodos[1];
    const convenio = p.linhas.find((l) => l.tipoAjuste === 'CONVENIO')!;
    expect(convenio).toMatchObject({ estado: 'DECLARADA', declaradaEm: '2026-09-04' });

    await casos.desmarcar('o1', convenio.negativaId!);
    const depois = (await casos.painel('o1', 2026)).periodos[1];
    expect(depois.linhas.find((l) => l.tipoAjuste === 'CONVENIO')!.estado).toBe('PENDENTE');
  });

  it('não marca tipo que teve ajuste assinado no período', async () => {
    const casos = new NegativaAjusteUseCases(repo({ ajustes: [ajuste('CONVENIO', '2026-06-01')] }).r, hoje);
    await expect(
      casos.marcar('o1', { ano: 2026, periodo: 2, tipos: ['CONVENIO'], declaradaEm: '2026-09-04' }),
    ).rejects.toThrow(/não cabe declaração negativa/);
  });

  it('recusa data futura, período inexistente e tipo inválido', async () => {
    const casos = new NegativaAjusteUseCases(repo().r, hoje);
    const base = { ano: 2026, periodo: 2, tipos: ['CONVENIO'], declaradaEm: '2026-09-04' };
    await expect(casos.marcar('o1', { ...base, declaradaEm: '2026-12-01' })).rejects.toThrow(/futura/);
    await expect(casos.marcar('o1', { ...base, periodo: 0 })).rejects.toThrow(/Período inválido/);
    await expect(casos.marcar('o1', { ...base, tipos: ['XPTO'] })).rejects.toThrow(/inválido/);
  });

  it('não desmarca registro de outro órgão', async () => {
    const { r } = repo();
    const casos = new NegativaAjusteUseCases(r, hoje);
    await casos.marcar('o1', { ano: 2026, periodo: 2, tipos: ['CONVENIO'], declaradaEm: '2026-09-04' });
    await expect(casos.desmarcar('o2', 'n1')).rejects.toThrow(/não encontrado/);
  });
});

describe('alerta da Declaração Negativa', () => {
  // 03/09/2026: o 2º quadrimestre fechou em 31/08 e o prazo vai até 08/09.
  const hoje = new Date('2026-09-03T12:00:00Z');
  const base = (extra: Partial<DadosAlertas>): DadosAlertas => ({
    prestacoesRejeitadas: [],
    certidoes: [],
    ajustesRecentes: [],
    aditivosRecentes: [],
    orgaos: [{ id: 'o1', nome: 'PREFEITURA X', periodicidade: 'QUADRIMESTRAL' }],
    ajustesSemPrestacao: 0,
    tarefasDeAlerta: [],
    lembretes: [],
    ...extra,
  });
  const listar = async (d: DadosAlertas) => {
    const caso = new ListarAlertasUseCase({ coletar: async () => d });
    return (await caso.execute({ usuarioId: 'u', grupoId: null }, hoje)).filter((a) => a.tipo === 'DECLARACAO_NEGATIVA');
  };

  it('diz quais tipos faltam', async () => {
    const [a] = await listar(
      base({
        assinaturas: [{ ...ajuste('TERMO_COLABORACAO', '2026-06-10'), clienteId: 'o1' }],
        negativasAjuste: [{ clienteId: 'o1', ano: 2026, periodo: 2, tipoAjuste: 'CONVENIO', declaradaEm: '2026-09-01' }],
      }),
    );
    expect(a.detalhe).toContain('Contrato de Gestão, Termo de Fomento, Termo de Parceria');
    expect(a.detalhe).not.toContain('Convênio');
  });

  it('some quando todos os tipos estão em dia', async () => {
    const tipos = ['CONTRATO_GESTAO', 'CONVENIO', 'TERMO_COLABORACAO', 'TERMO_FOMENTO', 'TERMO_PARCERIA'] as const;
    const alertas = await listar(
      base({
        assinaturas: [],
        negativasAjuste: tipos.map((tipoAjuste) => ({ clienteId: 'o1', ano: 2026, periodo: 2, tipoAjuste, declaradaEm: '2026-09-02' })),
      }),
    );
    expect(alertas).toHaveLength(0);
  });
});

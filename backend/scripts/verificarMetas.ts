/**
 * Confere as regras do Plano de Metas. Sem banco.
 *
 * O alvo é a geração dos períodos a partir da vigência. Errar ali **não quebra
 * tela nenhuma**: o quadro mostra os períodos que o sistema inventou, o usuário
 * preenche as quantidades que lhe foram oferecidas, e a divergência com o
 * cadastro feito na tela do TCESP só aparece quando a aferição é rejeitada —
 * meses depois, sem nada no caminho que acusasse.
 *
 * É o mesmo motivo do `verificar:alertas`: a contagem de períodos é aritmética
 * de calendário, o tipo de coisa que se confere errado de cabeça.
 *
 *   npm run verificar:metas
 */
import {
  distribuirProporcional,
  gerarPeriodos,
  periodosNoAno,
  rotuloPeriodo,
} from '../src/core/meta/periodos';
import {
  PERIODICIDADES_META,
  QUALIFICADORES_META,
  TIPOS_META,
  ehQuantificavel,
  temDetalhePeriodico,
} from '../src/core/meta/Meta';
import { validarMeta } from '../src/application/programa/ProgramaUseCases';
import type { MetaDTO } from '../src/application/programa/dtos';

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};
const recusa = (descricao: string, fn: () => unknown) => {
  try {
    fn();
    conferir(descricao, false, 'aceitou o que deveria recusar');
  } catch {
    conferir(descricao, true);
  }
};
const aceita = (descricao: string, fn: () => unknown) => {
  try {
    fn();
    conferir(descricao, true);
  } catch (e) {
    conferir(descricao, false, (e as Error).message);
  }
};

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** "6-8/2025" — compacta o período para comparar de olho. */
const resumo = (ps: ReturnType<typeof gerarPeriodos>) =>
  ps.map((p) => `${p.periodo}:${p.mesInicial}-${p.mesFinal}/${p.ano}${p.parcial ? '*' : ''}`).join(' ');

console.log('\nPlano de Metas\n');

// --- o exemplo do manual ----------------------------------------------------
// "vigência inicia em 01/06 e a periodicidade é quadrimestral → na primeira
//  periodicidade haverá somente 3 meses (junho, julho e agosto) e na última
//  somente um mês (maio)"
{
  const ps = gerarPeriodos('QUADRIMESTRAL', d('2025-06-01'), d('2026-05-31'));
  conferir('exemplo do manual gera 4 períodos', ps.length === 4, resumo(ps));
  conferir(
    'o primeiro é jun–ago, parcial de 3 meses',
    ps[0]?.mesInicial === 6 && ps[0]?.mesFinal === 8 && ps[0]?.meses === 3 && ps[0]?.parcial,
    resumo(ps.slice(0, 1)),
  );
  conferir(
    'o último é só maio, parcial de 1 mês',
    ps[3]?.mesInicial === 5 && ps[3]?.mesFinal === 5 && ps[3]?.meses === 1 && ps[3]?.parcial,
    resumo(ps.slice(3)),
  );
  conferir(
    'os do meio são cheios',
    !ps[1]?.parcial && !ps[2]?.parcial && ps[1]?.meses === 4 && ps[2]?.meses === 4,
  );
  conferir(
    'a numeração é do ano civil, não da vigência',
    // jun/2025 cai no 2º quadrimestre — se a contagem começasse na vigência,
    // este período seria o "1º", e o cadastro do TCESP diria outra coisa.
    ps[0]?.periodo === 2 && ps[1]?.periodo === 3 && ps[2]?.periodo === 1 && ps[3]?.periodo === 2,
    resumo(ps),
  );
}

// --- exercício civil cheio: nada é parcial ----------------------------------
{
  const ps = gerarPeriodos('MENSAL', d('2025-01-01'), d('2025-12-31'));
  conferir('mensal num ano cheio dá 12 períodos', ps.length === 12);
  conferir('nenhum parcial', ps.every((p) => !p.parcial && p.meses === 1));
  conferir('períodos numerados de 1 a 12', ps.map((p) => p.periodo).join() === '1,2,3,4,5,6,7,8,9,10,11,12');
}

{
  const ps = gerarPeriodos('EXERCICIO', d('2025-01-01'), d('2026-12-31'));
  conferir('no exercício, dois anos dão dois períodos', ps.length === 2, resumo(ps));
  conferir('ambos período 1', ps.every((p) => p.periodo === 1));
  conferir('ambos de 12 meses', ps.every((p) => p.meses === 12 && !p.parcial));
}

{
  const ps = gerarPeriodos('SEMESTRAL', d('2025-03-15'), d('2025-09-10'));
  conferir('semestral cortada dos dois lados dá 2 períodos', ps.length === 2, resumo(ps));
  conferir(
    'os dois são parciais',
    ps.every((p) => p.parcial) && ps[0]?.meses === 4 && ps[1]?.meses === 3,
    resumo(ps),
  );
  conferir(
    'o dia não conta, só o mês',
    // 15/03 e 10/09: o período começa em março e termina em setembro inteiros.
    // O TCESP pede quantidade por período, não pro rata de dias.
    ps[0]?.mesInicial === 3 && ps[1]?.mesFinal === 9,
  );
}

// --- a vigência de um mês só ------------------------------------------------
{
  const ps = gerarPeriodos('TRIMESTRAL', d('2025-07-01'), d('2025-07-31'));
  conferir('vigência de um mês dá um período', ps.length === 1, resumo(ps));
  conferir('parcial de 1 mês dentro do 3º trimestre', ps[0]?.periodo === 3 && ps[0]?.meses === 1 && ps[0]?.parcial);
}

// --- travessia de virada de ano ---------------------------------------------
{
  const ps = gerarPeriodos('BIMESTRAL', d('2025-11-01'), d('2026-02-28'));
  conferir('bimestral atravessando o ano dá 2 períodos', ps.length === 2, resumo(ps));
  conferir(
    'não há período "nov–fev": o ano civil corta',
    // Este é o erro que uma implementação ingênua comete — contar de 2 em 2
    // meses a partir do início da vigência. O cadastro do Tribunal numera os
    // bimestres do ano, e nov/dez é o 6º de 2025, não o 1º de nada.
    ps[0]?.ano === 2025 && ps[0]?.periodo === 6 && ps[1]?.ano === 2026 && ps[1]?.periodo === 1,
    resumo(ps),
  );
  conferir('ambos cheios', ps.every((p) => p.meses === 2 && !p.parcial));
}

// --- sem vigência não há período --------------------------------------------
{
  conferir('sem início, nenhum período', gerarPeriodos('MENSAL', null, d('2025-12-31')).length === 0);
  conferir('sem fim, nenhum período', gerarPeriodos('MENSAL', d('2025-01-01'), null).length === 0);
  conferir(
    'fim antes do início, nenhum período',
    gerarPeriodos('MENSAL', d('2025-12-01'), d('2025-01-01')).length === 0,
    'período inventado a partir de vigência incompleta é pior que nenhum',
  );
}

// --- única: um período, a vigência inteira ----------------------------------
{
  const ps = gerarPeriodos('UNICA', d('2025-06-01'), d('2026-05-31'));
  conferir('única dá um período só', ps.length === 1, resumo(ps));
  conferir('cobrindo a vigência inteira', ps[0]?.meses === 12 && !ps[0]?.parcial);
}

// --- a tabela de periodicidades bate com a aritmética -----------------------
{
  conferir(
    'os períodos por ano da tabela batem com o cálculo',
    PERIODICIDADES_META.filter((p) => p.id !== 'UNICA').every(
      (p) => p.periodos === periodosNoAno(p.id),
    ),
  );
  conferir(
    'todas as periodicidades geram ao menos um período num ano cheio',
    PERIODICIDADES_META.every(
      (p) => gerarPeriodos(p.id, d('2025-01-01'), d('2025-12-31')).length > 0,
    ),
  );
  conferir(
    'todo período tem rótulo',
    PERIODICIDADES_META.every((p) =>
      gerarPeriodos(p.id, d('2025-01-01'), d('2025-12-31')).every(
        (x) => rotuloPeriodo(p.id, x).trim().length > 0,
      ),
    ),
  );
}

// --- os tipos ---------------------------------------------------------------
{
  conferir('são três tipos de meta', TIPOS_META.length === 3);
  conferir(
    'só a não quantificável é não quantificável',
    TIPOS_META.filter((t) => !ehQuantificavel(t.id)).map((t) => t.id).join() ===
      'QUALITATIVA_NAO_QUANTIFICAVEL',
  );
  conferir(
    'quem não tem número não tem quadro',
    TIPOS_META.every((t) => ehQuantificavel(t.id) === temDetalhePeriodico(t.id)),
  );
  conferir('dois qualificadores, com símbolo', QUALIFICADORES_META.length === 2 &&
    QUALIFICADORES_META.every((q) => q.simbolo.length === 1));
}

// --- distribuição proporcional (o botão "mesma quantidade em todos") --------
{
  const ps = gerarPeriodos('QUADRIMESTRAL', d('2025-06-01'), d('2026-05-31')); // 3,4,4,1 meses
  const partes = distribuirProporcional(1200, ps);
  const soma = partes.reduce((s, v) => s + v, 0);
  conferir('a distribuição soma exatamente o total', Math.abs(soma - 1200) < 1e-9, String(soma));
  conferir(
    'o período de 3 meses recebe menos que o de 4',
    partes[0] < partes[1] && partes[1] === partes[2] && partes[3] < partes[0],
    partes.join(' / '),
  );
  conferir(
    'proporcional aos meses: 12 meses, 1200 → 100/mês',
    partes[0] === 300 && partes[1] === 400 && partes[3] === 100,
    partes.join(' / '),
  );
}
{
  // O caso que o arredondamento ingênuo erra: 100 em 3 períodos iguais.
  const ps = gerarPeriodos('QUADRIMESTRAL', d('2025-01-01'), d('2025-12-31'));
  const partes = distribuirProporcional(100, ps);
  const soma = Math.round(partes.reduce((s, v) => s + v, 0) * 100) / 100;
  conferir('100 em 3 períodos ainda soma 100', soma === 100, partes.join(' / '));
  conferir(
    'nenhuma parcela se afasta mais de um centavo da exata',
    partes.every((v) => Math.abs(v - 100 / 3) <= 0.01),
    partes.join(' / '),
  );
}

// --- validação da meta ------------------------------------------------------
console.log('\nValidação do cadastro da meta\n');

const periodosDe = (p: Parameters<typeof gerarPeriodos>[0], i: string, f: string, qtd = 10) =>
  gerarPeriodos(p, d(i), d(f)).map((x) => ({ ano: x.ano, periodo: x.periodo, quantidade: qtd }));

const base = (extra: Partial<MetaDTO> = {}): MetaDTO => ({
  codigoMeta: '001',
  nome: 'Atendimentos realizados',
  tipo: 'QUANTITATIVA',
  unidadeMedida: 'atendimentos',
  periodicidade: 'QUADRIMESTRAL',
  vigenciaInicio: '2025-01-01',
  vigenciaFim: '2025-12-31',
  periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31'),
  ...extra,
});

aceita('meta quantitativa completa é aceita', () => validarMeta(base()));

recusa('sem código', () => validarMeta(base({ codigoMeta: '  ' })));
recusa('sem o enunciado da meta', () => validarMeta(base({ nome: '' })));
recusa('tipo inexistente', () => validarMeta(base({ tipo: 'QUANTITATIVO' as never })));
recusa('periodicidade inexistente', () =>
  validarMeta(base({ periodicidade: 'DECENAL' as never, periodicidades: [] })));
recusa('quantificável sem unidade de medida', () => validarMeta(base({ unidadeMedida: null })));
recusa('quantificável sem vigência', () =>
  validarMeta(base({ vigenciaInicio: null, vigenciaFim: null, periodicidades: [] })));
recusa('vigência invertida', () =>
  validarMeta(base({ vigenciaInicio: '2025-12-01', vigenciaFim: '2025-01-01', periodicidades: [] })));
recusa('data fora do formato', () => validarMeta(base({ vigenciaInicio: '01/01/2025' })));
recusa('quantificável com periodicidade única', () =>
  validarMeta(base({ periodicidade: 'UNICA', periodicidades: [] })));

// O núcleo: o quadro tem de bater com os períodos que a vigência gera.
recusa('período fora da vigência', () =>
  validarMeta(
    base({
      periodicidades: [...periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31'),
        { ano: 2026, periodo: 1, quantidade: 10 }],
    }),
  ));
recusa('período faltando', () =>
  validarMeta(base({ periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31').slice(0, 2) })));
recusa('período repetido', () => {
  const ps = periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31');
  return validarMeta(base({ periodicidades: [...ps, ps[0]] }));
});
recusa('quantidade zero', () =>
  validarMeta(base({ periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31', 0) })));
recusa('quantidade negativa', () =>
  validarMeta(base({ periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31', -5) })));
recusa('qualificador inexistente', () =>
  validarMeta(
    base({
      periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31').map((p) => ({
        ...p,
        qualificador: 'MENOR_QUE' as never,
      })),
    }),
  ));

// A vigência que muda o número de períodos muda o quadro exigido.
recusa('quadro do ano cheio numa vigência que começa em junho', () =>
  validarMeta(
    base({
      vigenciaInicio: '2025-06-01',
      vigenciaFim: '2026-05-31',
      periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31'),
    }),
  ));
aceita('quadro gerado da vigência parcial é aceito', () =>
  validarMeta(
    base({
      vigenciaInicio: '2025-06-01',
      vigenciaFim: '2026-05-31',
      periodicidades: periodosDe('QUADRIMESTRAL', '2025-06-01', '2026-05-31'),
    }),
  ));

// --- a qualitativa não quantificável ----------------------------------------
{
  const nq = (extra: Partial<MetaDTO> = {}) =>
    base({
      tipo: 'QUALITATIVA_NAO_QUANTIFICAVEL',
      unidadeMedida: null,
      periodicidades: [],
      ...extra,
    });

  aceita('não quantificável sem unidade e sem quadro', () => validarMeta(nq()));
  recusa('não quantificável com quadro de quantidades', () =>
    validarMeta(nq({ periodicidades: [{ ano: 2025, periodo: 1, quantidade: 10 }] })));

  const dados = validarMeta(nq({ unidadeMedida: 'consultas', periodicidade: 'MENSAL' }));
  conferir(
    'a unidade enviada na não quantificável é descartada',
    dados.unidadeMedida === null,
    'guardá-la criaria dado que nenhuma tela lê e que reaparece ao trocar o tipo',
  );
  conferir(
    'a periodicidade é forçada a única',
    dados.periodicidade === 'UNICA',
    'o formulário esconde o campo ao escolher o tipo — recusar o que ele não mostra não teria conserto pela tela',
  );
  aceita('não quantificável pode ficar sem vigência', () =>
    validarMeta(nq({ vigenciaInicio: null, vigenciaFim: null })));
}

// --- a qualitativa quantificável se comporta como a quantitativa ------------
{
  aceita('qualitativa quantificável completa', () =>
    validarMeta(base({ tipo: 'QUALITATIVA_QUANTIFICAVEL', unidadeMedida: 'relatórios' })));
  recusa('qualitativa quantificável sem unidade', () =>
    validarMeta(base({ tipo: 'QUALITATIVA_QUANTIFICAVEL', unidadeMedida: null })));
}

// --- normalização -----------------------------------------------------------
{
  const dados = validarMeta(
    base({
      codigoMeta: ' 001 ',
      nome: '  Atendimentos  ',
      descricao: '   ',
      periodicidades: periodosDe('QUADRIMESTRAL', '2025-01-01', '2025-12-31')
        .reverse()
        .map((p) => ({ ...p, quantidade: '1.234,50' as unknown as number })),
    }),
  );
  conferir('espaços em volta são aparados', dados.codigoMeta === '001' && dados.nome === 'Atendimentos');
  conferir('descrição em branco vira nula', dados.descricao === null);
  conferir(
    'quantidade em padrão brasileiro é lida',
    dados.periodicidades.every((p) => p.quantidade === 1234.5),
    String(dados.periodicidades[0]?.quantidade),
  );
  conferir(
    'os períodos saem ordenados',
    dados.periodicidades.map((p) => p.periodo).join() === '1,2,3',
    'a tela desenha o quadro na ordem em que vem',
  );
  conferir(
    'o qualificador padrão é "igual a"',
    dados.periodicidades.every((p) => p.qualificador === 'IGUAL_A'),
  );
}

console.log(
  falhas.length
    ? `\n${falhas.length} falha(s):\n${falhas.map((f) => `  - ${f}`).join('\n')}\n`
    : '\nTudo certo.\n',
);
process.exit(falhas.length ? 1 : 0);

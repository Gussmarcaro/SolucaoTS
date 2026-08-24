/**
 * Confere as regras do Cadastro do Rateio. Sem banco.
 *
 * O alvo é a aritmética dos percentuais. Errar ali não quebra tela nenhuma: o
 * quadro mostra números plausíveis que somam 99,99% — e é o usuário que
 * descobre, conferindo à mão, exatamente o que o sistema existe para evitar.
 *
 *   npm run verificar:rateio
 */
import {
  CASAS_PERCENTUAL,
  METODOS,
  METODOS_IDS,
  calcularRateio,
  periodosSobrepoem,
  temQuadro,
  vigentesEm,
} from '../src/core/rateio/Rateio';
import { validarRateio } from '../src/application/rateio/RateioUseCases';

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

const id = (n: number) => `0000000${n}-0000-4000-8000-00000000000${n}`;
const AJ = [1, 2, 3, 4, 5].map(id);

console.log('\nCadastro do Rateio\n');

// --- o exemplo da especificação ---------------------------------------------
{
  const r = calcularRateio([
    { ajusteId: AJ[0], base: 100000 },
    { ajusteId: AJ[1], base: 200000 },
    { ajusteId: AJ[2], base: 100000 },
    { ajusteId: AJ[3], base: 300000 },
    { ajusteId: AJ[4], base: 300000 },
  ]);
  conferir('receita total soma 1.000.000', r.totalBase === 1_000_000, String(r.totalBase));
  conferir(
    'percentuais 10/20/10/30/30',
    r.linhas.map((l) => l.percentual).join('/') === '10/20/10/30/30',
  );
  conferir('percentual total 100', r.totalPercentual === 100);
}

// --- a mesma conta serve a colaboradores ------------------------------------
{
  const r = calcularRateio([
    { ajusteId: AJ[0], base: 100 },
    { ajusteId: AJ[1], base: 200 },
    { ajusteId: AJ[2], base: 100 },
    { ajusteId: AJ[3], base: 300 },
    { ajusteId: AJ[4], base: 300 },
  ]);
  conferir('total de colaboradores 1.000', r.totalBase === 1000);
  conferir(
    'mesmos percentuais, outra base',
    r.linhas.map((l) => l.percentual).join('/') === '10/20/10/30/30',
    'a conta não conhece receita nem colaborador — é o que permite método novo',
  );
}

// --- o caso que revela o arredondamento -------------------------------------
{
  // Três partes iguais: 33,333…% cada. Arredondadas a duas casas somariam
  // 99,99% — o quadro não fecharia, e conferir isso é o trabalho que o sistema
  // existe para dispensar.
  const r = calcularRateio([1, 2, 3].map((n) => ({ ajusteId: id(n), base: 100 })));

  const exibidos = r.linhas.map((l) => l.percentualExibido);
  conferir(
    'as parcelas EXIBIDAS somam exatamente 100,00%',
    exibidos.reduce((s, p) => s + p, 0) === 100,
    exibidos.join(' + ') + ' = ' + r.totalPercentual,
  );
  conferir(
    'a sobra vai para uma parcela só, e de um centésimo',
    exibidos.filter((p) => p === 33.34).length === 1 && exibidos.filter((p) => p === 33.33).length === 2,
    'método do maior resto — nenhuma parcela se afasta mais que 0,01 da exata',
  );
  conferir(
    'o percentual exato continua disponível',
    r.linhas[0].percentual === 33.333333,
    'a tela mostra o ajustado; quem precisa da conta usa o exato',
  );

  const somaIngenua = r.linhas.reduce((s, l) => s + Math.round(l.percentual * 100) / 100, 0);
  conferir(
    'arredondar cada parcela por conta própria quebraria o total',
    somaIngenua !== 100,
    'daria ' + somaIngenua + '% — é o que o maior resto evita',
  );
}

// --- base zero não divide por zero ------------------------------------------
{
  const r = calcularRateio([{ ajusteId: AJ[0], base: 0 }]);
  conferir('base total zero devolve percentual zero, não NaN', r.linhas[0].percentual === 0);
  conferir('e o total também é zero', r.totalPercentual === 0);
}

// --- catálogo de métodos ----------------------------------------------------
{
  conferir('os três métodos estão no catálogo', METODOS_IDS.length === 3, METODOS_IDS.join(', '));
  conferir('receita e colaboradores têm quadro', temQuadro('RECEITA') && temQuadro('COLABORADORES'));
  conferir('"Outros" não tem quadro', !temQuadro('OUTROS'), 'o critério ainda não foi definido');
  conferir(
    'todo método com quadro declara rótulo e formato',
    METODOS.filter((m) => m.rotuloBase).every((m) => !!m.formato && !!m.rotuloTotal),
    'método novo sem rótulo apareceria com a coluna em branco',
  );
}

// --- validação (a mesma regra que a tela aplica antes de enviar) ------------
{
  const base = {
    titulo: 'Rateio das Despesas Administrativas',
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '2026-12-31',
    metodo: 'RECEITA',
    participantes: [
      { ajusteId: AJ[0], base: 100000 },
      { ajusteId: AJ[1], base: 900000 },
    ],
  };

  conferir('caso íntegro passa', !!validarRateio(base));

  recusa('título curto é recusado', () => validarRateio({ ...base, titulo: 'x' }));
  recusa('método fora da lista é recusado', () => validarRateio({ ...base, metodo: 'POR_AREA' }));
  recusa('fim antes do início é recusado', () =>
    validarRateio({ ...base, vigenciaInicio: '2026-12-31', vigenciaFim: '2026-01-01' }),
  );
  recusa('quadro vazio é recusado', () => validarRateio({ ...base, participantes: [] }));
  recusa('ajuste repetido é recusado', () =>
    validarRateio({
      ...base,
      participantes: [
        { ajusteId: AJ[0], base: 1 },
        { ajusteId: AJ[0], base: 2 },
      ],
    }),
  );
  recusa('base negativa é recusada', () =>
    validarRateio({ ...base, participantes: [{ ajusteId: AJ[0], base: -1 }] }),
  );
  recusa('receita zero é recusada', () =>
    validarRateio({ ...base, participantes: [{ ajusteId: AJ[0], base: 0 }] }),
  );
  recusa('"Outros" sem critério descrito é recusado', () =>
    validarRateio({ ...base, metodo: 'OUTROS', descricaoMetodo: '' }),
  );

  const outros = validarRateio({ ...base, metodo: 'OUTROS', descricaoMetodo: 'Por área ocupada' });
  conferir(
    '"Outros" não guarda participantes',
    outros.participantes.length === 0,
    'quadro que a tela não mostra viraria dado órfão',
  );

  recusa('colaborador fracionado é recusado', () =>
    validarRateio({
      ...base,
      metodo: 'COLABORADORES',
      participantes: [{ ajusteId: AJ[0], base: 1.5 }],
    }),
  );
  conferir(
    'ajuste com zero colaboradores participa, se o total for maior que zero',
    validarRateio({
      ...base,
      metodo: 'COLABORADORES',
      participantes: [
        { ajusteId: AJ[0], base: 0 },
        { ajusteId: AJ[1], base: 10 },
      ],
    }).participantes.length === 2,
    'entra com 0%, e não deixa de participar',
  );
}

// --- vigência ---------------------------------------------------------------
{
  const r = (inicio: string, fim: string, ativo = true) => ({
    vigenciaInicio: inicio,
    vigenciaFim: fim,
    ativo,
  });
  const lista = [
    r('2026-01-01', '2026-06-30'),
    r('2026-07-01', '2026-12-31'),
    r('2026-01-01', '2026-12-31', false),
  ];

  conferir('acha o vigente na data', vigentesEm(lista, '2026-03-10').length === 1);
  conferir('inativo não é vigente', vigentesEm(lista, '2026-08-10').every((x) => x.ativo));
  conferir('fora de qualquer período não devolve nada', vigentesEm(lista, '2025-12-31').length === 0);
  conferir('o último dia do período ainda é vigente', vigentesEm(lista, '2026-06-30').length === 1);

  // Sobreposição é PERMITIDA de propósito: um rateio pela receita e outro por
  // colaboradores valem ao mesmo tempo, porque o método se escolhe pela natureza
  // da despesa. Isto prova apenas que o sistema sabe detectá-la quando precisar.
  conferir(
    'sabe dizer quando dois períodos se sobrepõem',
    periodosSobrepoem(
      { inicio: '2026-01-01', fim: '2026-06-30' },
      { inicio: '2026-06-30', fim: '2026-12-31' },
    ),
  );
  conferir(
    'e quando não se sobrepõem',
    !periodosSobrepoem(
      { inicio: '2026-01-01', fim: '2026-06-29' },
      { inicio: '2026-06-30', fim: '2026-12-31' },
    ),
  );
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);

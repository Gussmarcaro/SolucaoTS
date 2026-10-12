/**
 * Confere as competências do Plano de Aplicação. Sem banco.
 *
 * O número de meses **multiplica dinheiro**: é ele que transforma o mensal
 * digitado no total do exercício, e o plano é o teto contra o qual a despesa da
 * prestação é conferida. Errá-lo não quebra tela nenhuma — grava um plano maior
 * que o pactuado, e a divergência só aparece quando alguém soma à mão.
 *
 *   npm run verificar:plano
 */
import { janelaDoExercicio } from '../src/core/planoAplicacao/competencias';
import { numerarRubricas } from '../src/core/planoAplicacao/ordemRubricas';

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};

console.log('\nPlano de Aplicação — competências do exercício\n');

// O caso que motivou tudo: convênio assinado no meio do ano.
{
  const em2026 = janelaDoExercicio(2026, '2026-06-01', '2027-05-31');
  const em2027 = janelaDoExercicio(2027, '2026-06-01', '2027-05-31');
  conferir('2026 tem 7 competências (jun–dez)', em2026?.meses === 7, String(em2026?.meses));
  conferir('e começa em junho', em2026?.primeiro === 6 && em2026?.ultimo === 12);
  conferir('2027 tem 5 (jan–mai)', em2027?.meses === 5, String(em2027?.meses));
  conferir('e termina em maio', em2027?.primeiro === 1 && em2027?.ultimo === 5);
  conferir(
    'os dois são marcados como parciais',
    !!em2026?.parcial && !!em2027?.parcial,
    'a tela usa isso para explicar por que o anual não é doze vezes o mensal',
  );
}

// Ano do meio da vigência: cheio.
{
  const j = janelaDoExercicio(2027, '2026-06-01', '2028-05-31');
  conferir('ano no meio da vigência é cheio', j?.meses === 12 && j?.parcial === false);
}

// Vigência dentro de um ano só.
{
  const j = janelaDoExercicio(2026, '2026-03-10', '2026-08-31');
  conferir('vigência curta corta dos dois lados', j?.meses === 6 && j?.primeiro === 3 && j?.ultimo === 8);
}
{
  const j = janelaDoExercicio(2026, '2026-07-05', '2026-07-28');
  conferir('vigência de um mês dá uma competência', j?.meses === 1 && j?.primeiro === 7);
}

// O dia não conta: o plano é por competência mensal.
{
  const a = janelaDoExercicio(2026, '2026-06-30', '2026-12-01');
  const b = janelaDoExercicio(2026, '2026-06-01', '2026-12-31');
  conferir(
    'o dia da vigência não muda a janela',
    JSON.stringify(a) === JSON.stringify(b),
    'não existe meio mês de rubrica',
  );
}

// Sem vigência, o ano é cheio — a regra nova não tranca o cadastro antigo.
{
  conferir('sem início, ano cheio', janelaDoExercicio(2026, null, '2027-05-31')?.meses === 12);
  conferir('sem fim, ano cheio', janelaDoExercicio(2026, '2026-06-01', null)?.meses === 12);
  conferir('sem nenhuma das duas, ano cheio', janelaDoExercicio(2026, null, null)?.meses === 12);
  conferir(
    'data fora do formato ISO também cai no ano cheio',
    janelaDoExercicio(2026, '01/06/2026', '31/05/2027')?.meses === 12,
    'recusar aqui trancaria quem hoje consegue salvar',
  );
}

// Fora da vigência: nulo, não janela vazia.
{
  conferir(
    'exercício anterior à vigência é recusado',
    janelaDoExercicio(2025, '2026-06-01', '2027-05-31') === null,
  );
  conferir(
    'exercício posterior também',
    janelaDoExercicio(2028, '2026-06-01', '2027-05-31') === null,
    'não é um plano menor: é um plano de um ano em que a parceria não vigora',
  );
}

// O ano civil cheio não é "parcial" só por ter 12 meses contados.
{
  const j = janelaDoExercicio(2026, '2026-01-01', '2026-12-31');
  conferir('ano civil exato não é parcial', j?.meses === 12 && j?.parcial === false);
}


// ------------------------------------------- a ordem digitada é preservada
{
  /*
   * O plano é gravado uma linha por rubrica **e mês**, e a leitura ordenava
   * por categoria — alfabético. O quadro digitado na ordem do plano de
   * trabalho voltava reorganizado da primeira leitura depois de salvar.
   */
  const itens = [
    { categoria: 'Recursos Humanos', subcategoria: 'Salários', mes: 1 },
    { categoria: 'Recursos Humanos', subcategoria: 'Salários', mes: 2 },
    { categoria: 'Recursos Humanos', subcategoria: 'Encargos', mes: 1 },
    { categoria: 'Combustível', subcategoria: 'Combustível', mes: 1 },
  ];
  const n = numerarRubricas(itens);

  conferir('a primeira rubrica recebe 1', n[0].ordem === 1);
  conferir(
    'os doze meses de uma rubrica compartilham o número',
    n[0].ordem === n[1].ordem,
    'numerar linha a linha espalharia os meses da mesma categoria pelo quadro',
  );
  conferir('a segunda rubrica recebe 2', n[2].ordem === 2, 'mesma categoria, outra subcategoria');
  conferir(
    'Combustível fica em 3, não em 1',
    n[3].ordem === 3,
    'é onde o usuário o digitou; alfabeticamente viria primeiro',
  );
  conferir(
    'zero não é usado',
    n.every((i) => i.ordem > 0),
    'o 0 é das linhas anteriores à coluna, que caem no desempate alfabético',
  );
}

// Rubrica sem nome: o cronograma a aceita, porque nasceu agregado.
{
  const n = numerarRubricas([
    { categoria: null, subcategoria: null, mes: 1 },
    { categoria: null, subcategoria: null, mes: 2 },
    { categoria: 'Obras', subcategoria: 'Obras', mes: 1 },
  ]);
  conferir('rubrica vazia forma um grupo só', n[0].ordem === 1 && n[1].ordem === 1);
  conferir('e não colide com a seguinte', n[2].ordem === 2);
}

console.log(
  falhas.length
    ? `\n${falhas.length} falha(s):\n${falhas.map((f) => `  - ${f}`).join('\n')}\n`
    : '\nTudo certo.\n',
);
process.exit(falhas.length ? 1 : 0);

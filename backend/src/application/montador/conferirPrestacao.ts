import type { ContextoConferencia, DadosMontagem, Pendencia } from './tipos';
import { conferirTotalDoPlano, explicarPlano } from '@/core/planoAplicacao/totalDoPlano';
import { explicarFontesSemConta } from '@/core/ajuste/fontesSemConta';
import {
  conferirRegularidadeNosRepasses,
  explicarRegularidadeNosRepasses,
} from '@/core/entidade/regularidadeNosRepasses';

/**
 * O que ainda falta nesta prestação.
 *
 * **Não é a pergunta que `validarPrestacao` responde**, e a diferença é o
 * motivo desta função existir: `erros` é o que o **Tribunal rejeita**;
 * pendência é o que **passa na validação e mesmo assim está errado**.
 *
 * O JSON Schema do TCESP aceita `documentos_fiscais: []`. Uma prestação sem
 * nenhuma nota, sem nenhum pagamento e sem nenhum empenho é estruturalmente
 * válida: ela é transmitida, é aceita, e volta como inconformidade meses
 * depois. Quem responde antes disso é esta conferência.
 *
 * A regra de projeto é **não gritar à toa**: bloco vazio só vira pendência
 * onde vazio é esquecimento, nunca onde vazio é estado legítimo. Desconto,
 * devolução e glosa costumam ser zero numa parceria que correu bem, e bem
 * cedido idem — apontá-los ensinaria a ignorar o painel, que é exatamente o
 * que um painel de pendências não pode fazer. Pelo mesmo motivo, o que depende
 * de informação que esta função não tem (se o ajuste tem metas, se há plano de
 * aplicação) só é apontado quando o contexto confirma que deveria estar lá.
 *
 * Função pura: recebe os dados e o contexto, devolve a lista. Coberta por
 * `npm run verificar:conferencia`, sem banco.
 */
export function conferirPrestacao(d: DadosMontagem, ctx: ContextoConferencia): Pendencia[] {
  const p: Pendencia[] = [];
  const impede = (bloco: string | null, titulo: string) =>
    p.push({ bloco, titulo, severidade: 'IMPEDE' });

  /*
   * O total do Plano de Aplicação contra o valor do ajuste.
   *
   * O erro que isto pega é específico e silencioso: o plano é digitado
   * **mensal** e somado **anual**, então confundir as colunas multiplica o
   * plano pelo número de competências. Um ajuste de R$ 1,5 mi recebe um plano
   * de R$ 12 mi, e os dois números parecem plausíveis na tela.
   *
   * **Plano inexistente não vira pendência**, e é a regra de projeto deste
   * painel: o plano é opcional hoje, e cobrá-lo aqui trancaria quem nunca o
   * cadastrou — ruído em vez de aviso, que é o único defeito que um painel de
   * pendências não pode ter. O que se aponta é o plano que **existe e não
   * fecha**: aí não é estado legítimo, é conta errada.
   */
  /*
   * Fonte de recurso sem conta bancária.
   *
   * Impede, e não avisa: sem a conta da fonte não há como demonstrar de onde
   * saiu cada pagamento, e a prestação chega ao Tribunal sem a separação que a
   * norma exige. Diferente do plano, aqui não há "vazio legítimo" — a fonte foi
   * **declarada** pelo próprio ajuste; se ela existe, precisa de onde receber.
   */
  if (ctx.fontesSemConta.length) {
    // Sem bloco: a correção é no cadastro do Ajuste, não numa aba da prestação.
    impede(null, explicarFontesSemConta(ctx.fontesSemConta));
  }

  {
    const plano = conferirTotalDoPlano(ctx.totalDoPlano, ctx.valorDoAjuste);
    if (plano.situacao === 'A_MAIOR' || plano.situacao === 'A_MENOR') {
      // Sem bloco: a correção é no dossiê do Ajuste, não numa aba da prestação.
      impede(null, `Plano de Aplicação divergente — ${explicarPlano(plano)}`);
    }
  }
  const atencao = (bloco: string | null, titulo: string) =>
    p.push({ bloco, titulo, severidade: 'ATENCAO' });

  /*
   * 1. A prestação está oca?
   *
   * Estes cinco são a substância do documento. Nenhum deles vazio é situação
   * normal numa prestação que se vai transmitir — e todos passam no schema.
   */
  /*
   * O bloco de documentos fiscais vazio é pendência — **menos** quando tudo
   * que a parceria gastou foi folha de pagamento.
   *
   * A folha não é documento fiscal: ela é excluída do bloco de propósito, e
   * sai só nos pagamentos, com número 9999. Numa entidade cuja despesa é toda
   * de pessoal, o bloco vazio é o documento **correto** — e acusá-lo seria
   * mandar o usuário lançar uma nota que não existe, que é exatamente o
   * costume que a marca de folha veio desfazer.
   *
   * A pergunta é feita aos pagamentos porque é lá que a folha aparece: se há
   * pagamento e **todos** são folha, o vazio se explica sozinho.
   */
  const soFolha = d.pagamentos.length > 0 && d.pagamentos.every((x) => x.folha);
  if (!d.documentosFiscais.length && !soFolha)
    impede('documentosFiscais', 'Nenhum documento fiscal lançado.');
  if (!d.pagamentos.length) impede('pagamentos', 'Nenhum pagamento lançado.');
  if (!d.receitas.length) impede('receitas', 'Nenhuma receita ou repasse lançado.');
  if (!d.disponibilidades.length)
    impede('disponibilidades', 'Nenhuma disponibilidade informada — falta o saldo das contas.');

  /*
   * O empenho só é cobrado de quem empenha.
   *
   * A marca é do órgão: há concessores cujo repasse não passa por empenho
   * próprio. Cobrar de todos transformaria a pendência em ruído para uma
   * parte dos clientes — e ruído é o que faz o painel deixar de ser lido.
   */
  if (ctx.orgaoEmpenha && !d.empenhos.length) impede('empenhos', 'Nenhum empenho lançado.');

  /*
   * 2. A despesa está dentro do Plano de Aplicação?
   *
   * A regra já barra no momento de apropriar a nota, mas a barreira é daquele
   * instante: o plano pode ter sido alterado depois, e notas apropriadas antes
   * de a regra existir nunca passaram por ela. Aqui a conferência é refeita
   * sobre o que está de fato na prestação.
   */
  if (ctx.categoriasDoPlano.length) {
    const fora = new Set(
      d.documentosFiscais
        .filter((f) => !ctx.categoriasDoPlano.includes(f.categoriaDespesaTipo))
        .map((f) => f.categoriaDespesaTipo),
    );
    const notas = d.documentosFiscais.filter(
      (f) => !ctx.categoriasDoPlano.includes(f.categoriaDespesaTipo),
    ).length;
    if (notas)
      impede(
        'documentosFiscais',
        `${notas} documento(s) fiscal(is) com categoria de despesa fora do Plano de Aplicação ` +
          `(categoria${fora.size > 1 ? 's' : ''} ${[...fora].sort((a, b) => a - b).join(', ')}).`,
      );
  } else if (d.documentosFiscais.length) {
    // Sem plano não há o que conferir — e é a conferência que garante que a
    // entidade só executou o que foi pactuado. Vale o aviso, não o bloqueio:
    // ajuste antigo pode legitimamente não ter o plano digitado aqui.
    atencao(
      null,
      'O ajuste não tem Plano de Aplicação cadastrado — não há como conferir se as despesas estavam previstas.',
    );
  }

  /*
   * 3. As metas foram aferidas?
   *
   * Só perguntamos quando o ajuste **tem** metas: relatório de atividades
   * vazio num ajuste sem metas cadastradas não é pendência, é coerência.
   */
  if (ctx.metasPrevistas > 0) {
    const faltam = ctx.metasPrevistas - d.atividades.length;
    if (faltam > 0)
      atencao(
        'atividades',
        `${faltam} de ${ctx.metasPrevistas} meta(s) ainda sem aferição no relatório de atividades.`,
      );
    const semResultado = d.atividades.filter((a) => a.metaAtendida == null).length;
    if (semResultado)
      atencao(
        'atividades',
        `${semResultado} meta(s) aferida(s) sem dizer se foi atingida.`,
      );
  }

  /*
   * 3b. As metas não atingidas foram tratadas?
   *
   * **Nenhuma destas impede a transmissão, e é decisão, não cautela.** Meta não
   * atingida é fato da execução: o documento com ela é verdadeiro e o §19 não
   * exige justificativa nenhuma. O que estas pendências dizem é que há
   * *consequência* pendente de conferência — e quem decide qual é o termo do
   * ajuste, que o sistema não conhece.
   *
   * O elo com o dinheiro é a definição do próprio TCESP: o bloco *Desconto* é
   * "a dedução aplicada ao valor de repasse em razão do descumprimento parcial
   * ou integral de metas estabelecidas no plano de trabalho". Daí a terceira
   * regra abaixo ser a única do painel que olha para **dois** blocos ao mesmo
   * tempo.
   */
  const ap = ctx.apuracaoMetas;
  if (ap && ap.naoAtingidas > 0) {
    if (ap.naoAtingidasSemJustificativa)
      atencao(
        'atividades',
        `${ap.naoAtingidasSemJustificativa} meta(s) não atingida(s) sem justificativa.`,
      );

    if (ap.divergentes)
      atencao(
        'atividades',
        `${ap.divergentes} meta(s) marcada(s) como atendida(s) com quantidade fora do pactuado.`,
      );

    /*
     * Desconto vazio só vira pendência **quando há meta não atingida** — e é
     * essa condição que salva a regra do maior pecado deste painel. Desconto é
     * zero na parceria que correu bem, e apontá-lo sempre ensinaria a ignorar
     * a tela. Aqui o contexto confirma que deveria haver algo a decidir.
     *
     * O texto não afirma que **há** desconto devido: a régua costuma isentar
     * uma faixa inicial ("até 10%, comunicação sem penalidade"), e o sistema
     * não guarda a régua de nenhum ajuste. Dizer "lance o desconto" seria
     * inventar uma penalidade.
     */
    if (!d.descontos.length)
      atencao(
        'descontos',
        `${ap.naoAtingidas} de ${ap.atingidas + ap.naoAtingidas} aferição(ões) não atingiram a meta ` +
          `(${ap.percentualNaoAtingido.toLocaleString('pt-BR')}%) e nenhum desconto foi lançado — ` +
          `confira a regra de desconto do termo.`,
      );
  }

  /*
   * 4. Os documentos estão lá?
   *
   * O anexo **não vai no envio** — o TCESP recebe os dados, não os PDFs —, e
   * por isso faltar um nunca impede a transmissão. Mas é a primeira coisa que
   * a fiscalização pede ao analisar, e até aqui a resposta morava numa pasta de
   * rede. Agora que a despesa guarda os arquivos, a prestação sabe dizer quais
   * faltam **antes** de alguém perguntar.
   *
   * Basta **um** arquivo para a nota não ser apontada, qualquer que seja o
   * papel dele: exigir justamente o "Documento Fiscal" apontaria a nota de
   * autônomo que tem o recibo anexado — e cobrar o que já está lá é o caminho
   * mais curto para o painel deixar de ser lido.
   */
  if (ctx.notasSemAnexo > 0)
    atencao(
      'documentosFiscais',
      `${ctx.notasSemAnexo} documento(s) fiscal(is) sem nenhum arquivo anexado.`,
    );

  if (ctx.pagamentosSemComprovante > 0)
    atencao(
      'pagamentos',
      `${ctx.pagamentosSemComprovante} pagamento(s) sem comprovante anexado.`,
    );

  /*
   * 5. Coerências que ninguém confere à mão.
   *
   * Nenhuma delas é irregular por si — por isso são avisos. O que elas fazem é
   * pôr diante dos olhos um número que, sozinho numa tela, ninguém compara.
   */
  const soma = (xs: Array<{ valor: number }>) => xs.reduce((s, x) => s + x.valor, 0);
  const recebido = soma(d.receitas);
  const pago = soma(d.pagamentos);
  if (pago > recebido)
    atencao(
      'pagamentos',
      `Os pagamentos (${brl(pago)}) somam mais que as receitas (${brl(recebido)}).`,
    );

  const divergentes = d.disponibilidades.filter(
    (x) => Math.abs(x.saldoBancario - x.saldoContabil) >= 0.01,
  ).length;
  if (divergentes)
    atencao(
      'disponibilidades',
      `${divergentes} conta(s) com saldo bancário diferente do contábil — confira a conciliação.`,
    );

  /*
   * 6. A beneficiária estava regular quando o dinheiro saiu?
   *
   * A certidão **não vai no envio** — como o anexo, o TCESP recebe os dados. E
   * como o anexo, é o que a fiscalização pede primeiro. A diferença é de quem
   * responde: nota sem PDF é falha de arquivo; parcela liberada com certidão
   * vencida é responsabilidade pessoal de quem autorizou o repasse, e o
   * ressarcimento é do valor liberado.
   *
   * Avisa, não impede, e por dois motivos. O documento transmitido continua
   * verdadeiro — travá-lo seria esconder do Tribunal uma execução que de fato
   * aconteceu. E o que fazer com um repasse já liberado é decisão jurídica do
   * órgão, não conta que o sistema saiba fechar.
   *
   * Pergunta aos **repasses**, e não às receitas: o repasse é o ato do próprio
   * concessor, que é exatamente o ato que a verificação prévia condiciona.
   */
  for (const frase of explicarRegularidadeNosRepasses(
    conferirRegularidadeNosRepasses(
      ctx.certidoesRegularidade,
      d.repasses.map((r) => r.dataRepasse),
    ),
  ))
    // Sem bloco: a correção é na aba Regularidade Fiscal da **entidade**, não
    // numa aba da prestação — a mesma convenção do Plano e das fontes.
    atencao(null, frase);

  /** Quantos itens impedem a transmissão **sem contar** o próprio parecer. */
  const impeditivosAntesDoParecer = p.filter((x) => x.severidade === 'IMPEDE').length;

  /*
   * 7. O parecer conclusivo diz o mesmo que o resto da prestação?
   *
   * Esta é a única regra do painel que confere um bloco **contra o próprio
   * painel** — e é a que faltava. As sete declarações e a conclusão já eram
   * validadas uma a uma: todas respondidas, justificativa quando "Não". O que
   * ninguém conferia era a coerência entre elas, e entre o parecer e a
   * prestação que ele atesta. Dava para responder "Não houve cumprimento das
   * cláusulas" e concluir "Favorável", sem um aviso em todo o caminho.
   *
   * Importa porque o parecer não é mais um bloco: é a peça que o órgão
   * **assina**, afirmando ao Tribunal que examinou a execução. Parecer
   * favorável sobre prestação defeituosa é o fato que transfere ao signatário
   * o que seria responsabilidade da entidade.
   */
  if (d.parecer?.conclusaoParecer != null) {
    const { conclusaoParecer: conclusao, declaracoes } = d.parecer;
    const resposta = (tipo: number) => declaracoes.find((x) => x.tipoDeclaracao === tipo)?.declaracao;

    /*
     * Declarações 1 a 5 são achados sobre a execução: cumprimento das
     * cláusulas, regularidade dos gastos, identificação nos comprovantes,
     * encargos trabalhistas e princípios da administração. "Não" em qualquer
     * delas é defeito apontado pelo próprio órgão.
     *
     * A 6 (visita in loco) fica fora: "Não" ali é omissão do concessor, não
     * defeito da entidade, e não contradiz conclusão nenhuma. A 7 (sanções)
     * fica fora deste grupo e vale por si, mais abaixo: sanção aplicada e
     * cumprida pode conviver com parecer favorável.
     *
     * "Prejudicado" (3) também não entra: na declaração 4 ele é a resposta
     * **certa** de quem não teve gasto com pessoal.
     */
    const APONTAM_DEFEITO = [1, 2, 3, 4, 5];
    const negativas = APONTAM_DEFEITO.filter((t) => resposta(t) === 2);

    if (conclusao === 1 && negativas.length) {
      impede(
        'parecerConclusivo',
        `Parecer conclusivo contraditório: a conclusão é "Favorável" e a declaração ` +
          `${negativas.join(', ')} responde "Não" — ` +
          'defeito apontado pede ao menos "Favorável com ressalvas".',
      );
    }

    /*
     * O parecer contra o resto do painel.
     *
     * A contagem foi tirada **antes** de qualquer regra do parecer: senão o
     * parecer contraditório entraria na conta como justificativa de si mesmo.
     *
     * Avisa em vez de impedir: os itens que impedem já estão na lista e já
     * deixam a prestação "não pronta". Repetir a gravidade não acrescenta
     * bloqueio — acrescenta a informação de que o documento que se vai assinar
     * discorda da conferência, e é o signatário quem decide o que fazer com
     * isso.
     */
    if ((conclusao === 1 || conclusao === 2) && impeditivosAntesDoParecer > 0) {
      atencao(
        'parecerConclusivo',
        `A conferência aponta ${impeditivosAntesDoParecer} item(ns) que impede(m) a transmissão, ` +
          `e o parecer conclui "${conclusao === 1 ? 'Favorável' : 'Favorável com ressalvas'}". ` +
          'Resolva as pendências ou reveja o parecer antes de assiná-lo.',
      );
    }

    // Sanção aplicada e parecer favorável **sem ressalvas** é combinação que
    // merece um olhar: não é irregular — a sanção pode ter sido cumprida —, mas
    // é o tipo de incoerência que a fiscalização lê primeiro.
    if (conclusao === 1 && resposta(7) === 1)
      atencao(
        'parecerConclusivo',
        'O parecer declara que houve aplicação de sanções e conclui "Favorável" sem ressalvas.',
      );
  }

  return p;
}

/** Só para a mensagem — o valor já vem somado em reais. */
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

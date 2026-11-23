/**
 * Confere o painel "esta prestação está pronta?". Sem banco.
 *
 * O alvo não é a aritmética — é o **critério**. Uma pendência a mais e o painel
 * vira ruído que o usuário aprende a ignorar; uma a menos e ele afirma que está
 * tudo certo numa prestação oca. Os dois erros são silenciosos: a tela funciona
 * perfeitamente nos dois casos.
 *
 *   npm run verificar:conferencia
 */
import { conferirPrestacao } from '../src/application/montador/conferirPrestacao';
import type { ContextoConferencia, DadosMontagem } from '../src/application/montador/tipos';
import type { ApuracaoMetas } from '../src/core/meta/apuracao';
import { REGULARIDADE_DO_REPASSE } from '../src/core/entidade/regularidadeNosRepasses';

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};

/** Prestação vazia: todo bloco no zero. É o pior caso, e o que o schema aceita. */
function vazia(): DadosMontagem {
  return {
    ano: 2026,
    mes: 12,
    ehRetificacao: false,
    tipoAjuste: 'TERMO_COLABORACAO',
    codigoAjuste: '1234567890',
    municipio: 1,
    entidade: 1,
    valorAtualizadoAjuste: 100000,
    empregados: [],
    bens: [],
    documentosFiscais: [],
    pagamentos: [],
    receitas: [],
    disponibilidades: [],
    saldoFundoFixo: 0,
    descontos: [],
    devolucoes: [],
    glosas: [],
    empenhos: [],
    repasses: [],
    servidores: [],
    atividades: [],
    dadosGerais: null,
    responsaveis: null,
    declaracoesBloco: null,
    parecer: null,
    transparencia: null,
    demonstracoes: null,
    publicacaoParecerAta: null,
    publicacaoRelAtividades: null,
    prestacaoEntidade: null,
    relatorioFinal: null,
    regulamentoCompras: null,
    extratoFisicoFinanceiro: null,
    termoBensCedidos: null,
    contratos: [],
    ajustesSaldo: null,
    tipoVeiculo: null,
    nomeVeiculo: null,
    dataPublicacao: null,
    enderecoInternet: null,
  } as unknown as DadosMontagem;
}

/** Prestação com o mínimo de substância em cada bloco cobrado. */
function completa(): DadosMontagem {
  const d = vazia();
  d.documentosFiscais = [
    {
      numero: '1',
      credorTipoDoc: 'CNPJ',
      credorNumeroDoc: '00000000000191',
      credorNome: 'Fornecedor',
      descricao: 'Serviço',
      dataEmissao: '2026-03-01',
      estadoEmissor: null,
      valorBruto: 1000,
      valorEncargos: 0,
      categoriaDespesaTipo: 10,
      rateioProveniente: false,
      rateioPercentual: null,
      contrato: null,
    },
  ];
  d.pagamentos = [
    {
      folha: false,
      docNumero: '1',
      docCredorTipo: 'CNPJ',
      docCredorNumero: '00000000000191',
      dataPagamento: '2026-03-10',
      valor: 1000,
      fonteRecursoTipo: 1,
      meioPagamento: 'TRANSFERENCIA',
      banco: 1,
      agencia: 1,
      contaCorrente: '1',
      numeroTransacao: null,
    },
  ];
  d.receitas = [
    { tipo: 'REPASSE', descricao: null, dataPrevista: null, dataRepasse: '2026-02-01', fonteRecursoTipo: 1, valor: 5000 },
  ];
  d.disponibilidades = [
    { banco: 1, agencia: 1, conta: '1', contaTipo: 1, saldoBancario: 4000, saldoContabil: 4000 },
  ];
  d.empenhos = [
    { numero: '1', dataEmissao: '2026-01-05', classificacaoEconomica: '33503900', fonteRecursoTipo: 1, valor: 5000, historico: 'Repasse', cpfOrdenadorDespesa: '00000000000' },
  ];
  return d;
}

const ctxPadrao: ContextoConferencia = {
  categoriasDoPlano: [10, 20],
  metasPrevistas: 0,
  notasSemAnexo: 0,
  pagamentosSemComprovante: 0,
  orgaoEmpenha: true,
  apuracaoMetas: null,
  // O caso normal: o plano fecha com o valor do ajuste. Os cenários que
  // divergem o fazem explicitamente, abaixo.
  fontesSemConta: [],
  totalDoPlano: 1_000_000,
  valorDoAjuste: 1_000_000,
  // O caso normal: a beneficiária tem as cinco certidões em dia. Os cenários
  // que divergem o fazem explicitamente, abaixo.
  certidoesRegularidade: REGULARIDADE_DO_REPASSE.map((tipo) => ({
    tipo,
    dataVencimento: '2030-12-31',
  })),
};

const tem = (ps: ReturnType<typeof conferirPrestacao>, bloco: string | null, trecho: string) =>
  ps.some((p) => p.bloco === bloco && p.titulo.includes(trecho));

console.log('\nConferência da prestação\n');

// --- a prestação oca --------------------------------------------------------
{
  const p = conferirPrestacao(vazia(), ctxPadrao);
  conferir('prestação vazia acusa documento fiscal', tem(p, 'documentosFiscais', 'Nenhum documento'));
  conferir('prestação vazia acusa pagamento', tem(p, 'pagamentos', 'Nenhum pagamento'));
  conferir('prestação vazia acusa receita', tem(p, 'receitas', 'Nenhuma receita'));
  conferir('prestação vazia acusa disponibilidade', tem(p, 'disponibilidades', 'Nenhuma disponibilidade'));
  conferir('prestação vazia acusa empenho', tem(p, 'empenhos', 'Nenhum empenho'));
  conferir(
    'e todas impedem a transmissão',
    p.filter((x) => x.severidade === 'IMPEDE').length >= 5,
  );
}

/*
 * A parceria cuja despesa é toda de pessoal.
 *
 * A folha não é documento fiscal: ela é excluída do bloco de propósito e sai
 * só nos pagamentos, com nº 9999. Numa entidade assim o bloco vazio é o
 * documento **correto**, e acusá-lo mandaria lançar uma nota que não existe —
 * que é o costume que a marca de folha veio desfazer.
 */
{
  const d = vazia();
  d.pagamentos = [
    {
      folha: true,
      docNumero: null,
      docCredorTipo: null,
      docCredorNumero: null,
      dataPagamento: '2025-03-10',
      valor: 12000,
      fonteRecursoTipo: 1,
      meioPagamento: 'BANCO',
      banco: 341,
      agencia: 1234,
      contaCorrente: '56789-0',
      numeroTransacao: null,
    },
  ];
  const p = conferirPrestacao(d, ctxPadrao);
  conferir(
    'só folha não acusa documento fiscal vazio',
    !tem(p, 'documentosFiscais', 'Nenhum documento'),
  );
  conferir('e também não acusa pagamento', !tem(p, 'pagamentos', 'Nenhum pagamento'));
}

/*
 * Mas basta **um** pagamento de nota para o bloco vazio voltar a ser
 * pendência: aí falta mesmo a nota daquele pagamento.
 */
{
  const d = vazia();
  d.pagamentos = [
    {
      folha: true,
      docNumero: null,
      docCredorTipo: null,
      docCredorNumero: null,
      dataPagamento: '2025-03-10',
      valor: 12000,
      fonteRecursoTipo: 1,
      meioPagamento: 'BANCO',
      banco: 341,
      agencia: 1234,
      contaCorrente: '56789-0',
      numeroTransacao: null,
    },
    {
      folha: false,
      docNumero: '1234',
      docCredorTipo: 'CNPJ',
      docCredorNumero: '11222333000181',
      dataPagamento: '2025-04-10',
      valor: 500,
      fonteRecursoTipo: 1,
      meioPagamento: 'BANCO',
      banco: 341,
      agencia: 1234,
      contaCorrente: '56789-0',
      numeroTransacao: null,
    },
  ];
  const p = conferirPrestacao(d, ctxPadrao);
  conferir(
    'um pagamento de nota faz o bloco vazio voltar a acusar',
    tem(p, 'documentosFiscais', 'Nenhum documento'),
  );
}

// --- o que NÃO pode virar pendência -----------------------------------------
{
  const p = conferirPrestacao(completa(), ctxPadrao);
  conferir('prestação com substância não tem pendência impeditiva', !p.some((x) => x.severidade === 'IMPEDE'), `${p.length} pendência(s)`);

  // A regra central do módulo: vazio legítimo não é pendência. Acrescentar
  // desconto/devolução/glosa/bem a esta lista é o erro mais caro daqui — é o
  // que faz o painel virar ruído e deixar de ser lido.
  const texto = p.map((x) => x.titulo).join(' | ');
  for (const legitimo of ['desconto', 'devolução', 'glosa', 'bem', 'empregado', 'servidor'])
    conferir(`não cobra ${legitimo} vazio`, !texto.toLowerCase().includes(legitimo));
}

// --- empenho só é cobrado de quem empenha -----------------------------------
{
  const d = completa();
  d.empenhos = [];
  conferir(
    'órgão que empenha é cobrado do empenho',
    tem(conferirPrestacao(d, { ...ctxPadrao, orgaoEmpenha: true }), 'empenhos', 'Nenhum empenho'),
  );
  conferir(
    'órgão que NÃO empenha não é cobrado',
    !tem(conferirPrestacao(d, { ...ctxPadrao, orgaoEmpenha: false }), 'empenhos', 'Nenhum empenho'),
  );
}

// --- plano de aplicação -----------------------------------------------------
{
  const d = completa();
  d.documentosFiscais[0].categoriaDespesaTipo = 99; // fora do plano [10, 20]
  const p = conferirPrestacao(d, ctxPadrao);
  conferir('nota com categoria fora do plano é impeditiva', tem(p, 'documentosFiscais', 'fora do Plano'));
  conferir(
    'e a mensagem diz qual categoria',
    p.some((x) => x.titulo.includes('99')),
  );

  // Sem plano não há o que conferir — mas também não se pode afirmar que está
  // certo. Aviso, não bloqueio: ajuste antigo pode não ter o plano digitado.
  const semPlano = conferirPrestacao(completa(), { ...ctxPadrao, categoriasDoPlano: [] });
  conferir('sem plano cadastrado vira atenção, não bloqueio', tem(semPlano, null, 'não tem Plano de Aplicação'));
  conferir(
    'e não impede a transmissão',
    !semPlano.some((x) => x.severidade === 'IMPEDE'),
  );

  // Prestação sem nota nenhuma não deve reclamar de plano: já reclamou da nota.
  const vaziaSemPlano = conferirPrestacao(vazia(), { ...ctxPadrao, categoriasDoPlano: [] });
  conferir(
    'prestação sem notas não reclama do plano (já reclamou da nota)',
    !tem(vaziaSemPlano, null, 'não tem Plano de Aplicação'),
  );
}

// --- metas ------------------------------------------------------------------
{
  const semMetas = conferirPrestacao(completa(), { ...ctxPadrao, metasPrevistas: 0 });
  conferir(
    'ajuste sem metas não cobra relatório de atividades',
    !semMetas.some((x) => x.bloco === 'atividades'),
  );

  const comMetas = conferirPrestacao(completa(), { ...ctxPadrao, metasPrevistas: 3 });
  conferir('ajuste com 3 metas e nenhuma aferida acusa as 3', tem(comMetas, 'atividades', '3 de 3'));

  const d = completa();
  d.atividades = [
    { nomePrograma: 'P', codigoMeta: '1', periodo: 1, quantidadeRealizada: 10, resultadoMeta: null, justificativaPeriodo: null, metaAtendida: null, justificativaMeta: null },
  ];
  const parcial = conferirPrestacao(d, { ...ctxPadrao, metasPrevistas: 2 });
  conferir('aferição parcial acusa o que falta', tem(parcial, 'atividades', '1 de 2'));
  conferir('e acusa a meta sem dizer se foi atingida', tem(parcial, 'atividades', 'sem dizer se foi atingida'));
}

// --- coerências -------------------------------------------------------------
{
  const d = completa();
  d.pagamentos[0].valor = 9000; // maior que a receita de 5000
  const p = conferirPrestacao(d, ctxPadrao);
  conferir('pagamento maior que receita vira atenção', tem(p, 'pagamentos', 'somam mais que as receitas'));
  conferir(
    'mas não impede — pode ser saldo de exercício anterior',
    !p.some((x) => x.bloco === 'pagamentos' && x.severidade === 'IMPEDE'),
  );

  const e = completa();
  e.disponibilidades[0].saldoContabil = 3990;
  conferir(
    'saldo bancário diferente do contábil vira atenção',
    tem(conferirPrestacao(e, ctxPadrao), 'disponibilidades', 'diferente do contábil'),
  );

  // Diferença de centavo não existe: o limite é 0,01, e abaixo dele é ruído
  // de arredondamento, não divergência.
  const f = completa();
  f.disponibilidades[0].saldoContabil = 4000.004;
  conferir(
    'diferença menor que um centavo não vira pendência',
    !tem(conferirPrestacao(f, ctxPadrao), 'disponibilidades', 'diferente do contábil'),
  );
}

// --- toda pendência tem de ser acionável ------------------------------------
{
  const p = [
    ...conferirPrestacao(vazia(), ctxPadrao),
    ...conferirPrestacao(completa(), { ...ctxPadrao, categoriasDoPlano: [], metasPrevistas: 2 }),
  ];
  conferir('nenhuma pendência sem título', p.every((x) => x.titulo.trim().length > 0));
  conferir(
    'toda pendência termina em ponto (é frase, não rótulo)',
    p.every((x) => x.titulo.trim().endsWith('.')),
  );
  conferir(
    'severidade sempre declarada',
    p.every((x) => x.severidade === 'IMPEDE' || x.severidade === 'ATENCAO'),
  );
}

// --- anexos: o que a fiscalização pede ao analisar --------------------------
{
  const semNada = conferirPrestacao(completa(), { ...ctxPadrao, notasSemAnexo: 3 });
  conferir('acusa nota sem arquivo anexado', tem(semNada, 'documentosFiscais', '3 documento(s)'));
  conferir(
    'mas não impede a transmissão — o anexo não vai no envio',
    !semNada.some((x) => x.severidade === 'IMPEDE'),
  );

  const semComprovante = conferirPrestacao(completa(), {
    ...ctxPadrao,
    pagamentosSemComprovante: 2,
  });
  conferir('acusa pagamento sem comprovante', tem(semComprovante, 'pagamentos', '2 pagamento(s)'));
  conferir(
    'e também não impede',
    !semComprovante.some((x) => x.severidade === 'IMPEDE'),
  );

  // Zero não fala: a prestação com tudo anexado não pode ganhar uma linha
  // dizendo "0 documentos sem arquivo" — é ruído, e ruído é o que faz o
  // painel deixar de ser lido.
  const completos = conferirPrestacao(completa(), ctxPadrao);
  conferir(
    'com tudo anexado não sobra linha de anexo',
    !completos.some((x) => x.titulo.includes('anexado')),
  );
}

// --- atingimento de metas × bloco Desconto ----------------------------------
//
// O TCESP define o Desconto como "a dedução aplicada ao valor de repasse em
// razão do descumprimento parcial ou integral de metas". É o único par de
// blocos do painel que se olha em conjunto, e por isso o único lugar onde uma
// regra errada faria o painel cobrar penalidade que não existe.
console.log('\n--- metas não atingidas e o Desconto ---');
{
  const ap = (over: Partial<ApuracaoMetas> = {}): ApuracaoMetas => ({
    aferidas: 10,
    atingidas: 8,
    naoAtingidas: 2,
    indeterminadas: 0,
    naoAtingidasSemJustificativa: 0,
    divergentes: 0,
    percentualNaoAtingido: 20,
    linhas: [],
    ...over,
  });
  const com = (a: ApuracaoMetas | null, mexer?: (d: DadosMontagem) => void) => {
    const d = completa();
    mexer?.(d);
    return conferirPrestacao(d, { ...ctxPadrao, apuracaoMetas: a });
  };

  // A regra que protege o painel de virar ruído.
  const semNaoAtingida = com(ap({ atingidas: 10, naoAtingidas: 0, percentualNaoAtingido: 0 }));
  conferir(
    'metas todas atingidas: desconto vazio NÃO é pendência',
    !tem(semNaoAtingida, 'descontos', 'desconto'),
    'desconto é zero na parceria que correu bem — apontá-lo sempre ensinaria a ignorar a tela',
  );
  conferir(
    'ajuste sem metas: nada sobre desconto',
    !tem(com(null), 'descontos', 'desconto'),
  );

  const semDesconto = com(ap(), (d) => {
    d.descontos = [];
  });
  conferir(
    'com meta não atingida e desconto vazio, aponta',
    tem(semDesconto, 'descontos', '2 de 10 aferição(ões) não atingiram a meta'),
  );
  conferir('e mostra o percentual', tem(semDesconto, 'descontos', '20%'));
  conferir(
    'mas NÃO impede a transmissão',
    !semDesconto.some((x) => x.severidade === 'IMPEDE' && x.bloco === 'descontos'),
    'a régua do ajuste pode isentar a faixa inicial, e o sistema não guarda régua nenhuma',
  );
  conferir(
    'o texto não afirma que há desconto devido',
    !semDesconto.some((x) => /lance o desconto|deve ser descontado/i.test(x.titulo)),
    'afirmar penalidade sem conhecer o termo seria inventar consequência',
  );

  const comDesconto = com(ap(), (d) => {
    d.descontos = [{ data: '2026-03-01', descricao: 'Metas não atingidas', valor: 1000 }];
  });
  conferir(
    'com desconto lançado, a pendência some',
    !tem(comDesconto, 'descontos', 'não atingiram a meta'),
  );

  const semJust = com(ap({ naoAtingidasSemJustificativa: 2 }));
  conferir(
    'acusa meta não atingida sem justificativa',
    tem(semJust, 'atividades', '2 meta(s) não atingida(s) sem justificativa'),
  );
  conferir(
    'justificativa faltando também não impede',
    !semJust.some((x) => x.severidade === 'IMPEDE' && x.bloco === 'atividades'),
    'o §19 não exige justificativa — é controle do órgão, não requisito do Tribunal',
  );

  const divergente = com(ap({ divergentes: 1 }));
  conferir(
    'acusa "atendida" com quantidade fora do pactuado',
    tem(divergente, 'atividades', 'marcada(s) como atendida(s)'),
    'é exatamente o ponto que a fiscalização questiona, e ninguém o veria sem apontar',
  );
}


// ------------- o Plano de Aplicação tem de fechar com o valor do ajuste
{
  /*
   * O erro é silencioso e específico: o plano é digitado **mensal** e somado
   * **anual**, então trocar as colunas multiplica o plano pelo número de
   * competências. Um ajuste de R$ 1,5 mi recebe um plano de R$ 12 mi, e os dois
   * números parecem plausíveis na tela.
   */
  const comPlanoMaior = conferirPrestacao(completa(), {
    ...ctxPadrao,
    totalDoPlano: 12_000_000,
    valorDoAjuste: 1_500_000,
  });
  conferir(
    'plano que não fecha com o ajuste impede',
    comPlanoMaior.some((x) => x.titulo.includes('Plano de Aplicação divergente')),
    'é despesa declarada contra um teto que não existe',
  );

  const comPlanoMenor = conferirPrestacao(completa(), {
    ...ctxPadrao,
    totalDoPlano: 400_000,
    valorDoAjuste: 1_500_000,
  });
  conferir('plano menor diz quanto falta', comPlanoMenor.some((x) => x.titulo.includes('faltam')));

  /*
   * **A regra que salva o painel de virar ruído.** O plano é opcional hoje:
   * cobrar quem nunca o cadastrou trancaria usuários que operam há meses, e
   * pendência que aparece para todo mundo ensina a ignorar a tela.
   */
  const semPlano = conferirPrestacao(completa(), {
    ...ctxPadrao,
    totalDoPlano: 0,
    valorDoAjuste: 1_500_000,
  });
  conferir(
    'ajuste sem plano nenhum NÃO vira pendência',
    !semPlano.some((x) => x.titulo.includes('Plano de Aplicação divergente')),
    'o plano é opcional; apontá-lo sempre transformaria o painel em ruído',
  );

  conferir(
    'plano que fecha não é apontado',
    !conferirPrestacao(completa(), ctxPadrao).some((x) =>
      x.titulo.includes('Plano de Aplicação divergente'),
    ),
  );
}


// ---------------- fonte de recurso sem conta bancária
{
  /*
   * Impede, e não avisa: sem a conta da fonte não há como demonstrar de onde
   * saiu cada pagamento. Aqui não há "vazio legítimo" — a fonte foi DECLARADA
   * pelo próprio ajuste; se ela existe, precisa de onde receber.
   */
  const p = conferirPrestacao(completa(), { ...ctxPadrao, fontesSemConta: [2, 5] });
  conferir(
    'fonte sem conta impede',
    p.some((x) => x.titulo.includes('não têm conta bancária') && x.severidade === 'IMPEDE'),
  );
  conferir(
    'com todas cobertas não aparece',
    !conferirPrestacao(completa(), ctxPadrao).some((x) => x.titulo.includes('conta bancária')),
  );
}


// ------- a beneficiária estava regular no dia em que o dinheiro saiu?
console.log('\n--- regularidade da beneficiária nas datas de repasse ---');
{
  const comRepasse = (datas: string[]) => {
    const d = completa();
    d.repasses = datas.map((dataRepasse) => ({
      empenhoNumero: null,
      empenhoDataEmissao: null,
      dataPrevista: dataRepasse,
      dataRepasse,
      valorPrevisto: 1000,
      valorRepasse: 1000,
      justificativaDiferenca: null,
      tipoDocumentoBancario: null,
      descricaoOutros: null,
      numeroDocumento: null,
      banco: null,
      agencia: null,
      conta: null,
    }));
    return d;
  };
  /** As cinco certidões em dia, menos as que o cenário resolver mexer. */
  const certidoes = (
    over: Record<string, string | null> = {},
  ): ContextoConferencia['certidoesRegularidade'] =>
    REGULARIDADE_DO_REPASSE.map((tipo) => ({
      tipo,
      dataVencimento: tipo in over ? over[tipo] : '2030-12-31',
    }));
  const rodar = (datas: string[], over?: Record<string, string | null>, lista = certidoes(over)) =>
    conferirPrestacao(comRepasse(datas), { ...ctxPadrao, certidoesRegularidade: lista });

  conferir(
    'certidões em dia: nada é apontado',
    !rodar(['2026-03-10', '2026-06-10']).some((x) => /regularidade/i.test(x.titulo)),
  );

  const vencida = rodar(['2026-03-10', '2026-06-10'], { FGTS: '2026-04-30' });
  conferir(
    'FGTS vencido antes de um repasse é apontado',
    vencida.some((x) => x.titulo.includes('FGTS (venceu em 30/04/2026)')),
  );
  conferir(
    'diz quantos repasses ficaram descobertos e até quando',
    vencida.some((x) => x.titulo.includes('1 repasse') && x.titulo.includes('10/06/2026')),
  );
  conferir(
    'avisa, mas NÃO impede a transmissão',
    !vencida.some((x) => x.severidade === 'IMPEDE' && /regularidade/i.test(x.titulo)),
    'o documento continua verdadeiro; o que fazer com o repasse já feito é decisão do órgão',
  );

  /*
   * A regra que salva o painel. O vencimento é o último dia de validade: o
   * repasse feito NO dia está coberto. Errar isso apontaria por um dia de
   * diferença, que é a pior espécie de falso positivo — parece bug.
   */
  conferir(
    'repasse no próprio dia do vencimento está coberto',
    !rodar(['2026-04-30'], { FGTS: '2026-04-30' }).some((x) => x.titulo.includes('FGTS')),
  );

  /*
   * **A outra regra que salva o painel.** A aba guarda o conjunto ATUAL de
   * certidões, não o histórico: quem renovou tem só a vigente, cujo vencimento
   * é futuro. Se a regra exigisse prova de cobertura na data, apontaria toda
   * prestação do sistema.
   */
  conferir(
    'certidão vigente hoje cobre repasse antigo',
    !rodar(['2024-01-15'], { FGTS: '2030-12-31' }).some((x) => /regularidade/i.test(x.titulo)),
    'a aba guarda o conjunto atual, não o histórico — exigir a prova apontaria todo mundo',
  );

  conferir(
    'sem repasse nenhum, a pergunta não é feita',
    !conferirPrestacao(completa(), { ...ctxPadrao, certidoesRegularidade: [] }).some((x) =>
      /regularidade/i.test(x.titulo),
    ),
    'repasse vazio pode ser legítimo; cobrar certidão sem repasse seria ruído',
  );

  const semNada = rodar(['2026-03-10'], undefined, []);
  conferir(
    'nenhuma certidão cadastrada: uma linha só, não cinco',
    semNada.filter((x) => /certid/i.test(x.titulo)).length === 1,
    'uma por tipo encheria o painel de linhas quase iguais',
  );
  conferir(
    'e diz onde se resolve',
    semNada.some((x) => x.titulo.includes('Regularidade Fiscal')),
  );

  const semDuas = rodar(['2026-03-10'], undefined, [
    { tipo: 'FEDERAL', dataVencimento: '2030-12-31' },
    { tipo: 'ESTADUAL', dataVencimento: '2030-12-31' },
    { tipo: 'MUNICIPAL', dataVencimento: '2030-12-31' },
  ]);
  conferir(
    'faltando parte, nomeia só o que falta',
    semDuas.some((x) => x.titulo.includes('FGTS, Trabalhista (CNDT)')),
  );

  conferir(
    'certidão cadastrada SEM vencimento conta como ausente',
    rodar(['2026-03-10'], { FGTS: null }).some((x) => x.titulo.includes('FGTS')),
    'sem a data não há o que comparar — tratá-la como cobertura esconderia o cadastro pela metade',
  );

  /*
   * CEBAS e Utilidade Pública são títulos de HABILITAÇÃO, não condição de
   * liberação de parcela. Cobrá-los aqui pediria CEBAS de quem não precisa.
   */
  conferir(
    'CEBAS vencido não é apontado por esta regra',
    !rodar(['2026-03-10'], undefined, [
      ...certidoes(),
      { tipo: 'CEBAS', dataVencimento: '2020-01-01' },
    ]).some((x) => x.titulo.includes('CEBAS')),
  );
}


// ------------- o parecer conclusivo contra o resto da prestação
console.log('\n--- coerência do parecer conclusivo ---');
{
  type Dec = { tipoDeclaracao: number; declaracao: number | null; justificativa: string | null };
  const todasSim = (): Dec[] =>
    [1, 2, 3, 4, 5, 6, 7].map((t) => ({
      tipoDeclaracao: t,
      // A 7 é a única em que "Sim" é má notícia (houve sanção): o caso normal
      // dela é "Não".
      declaracao: t === 7 ? 2 : 1,
      justificativa: null,
    }));
  const comParecer = (conclusao: number | null, mexer?: (d: Dec[]) => void, base = completa()) => {
    const declaracoes = todasSim();
    mexer?.(declaracoes);
    base.parecer = {
      identificacaoParecer: '0000000001',
      conclusaoParecer: conclusao,
      consideracoesParecer: null,
      declaracoes,
    };
    return base;
  };
  const rodar = (...args: Parameters<typeof comParecer>) =>
    conferirPrestacao(comParecer(...args), ctxPadrao);

  conferir(
    'parecer favorável e tudo "Sim": nada é apontado',
    !rodar(1).some((x) => x.bloco === 'parecerConclusivo'),
  );

  const contradiz = rodar(1, (ds) => {
    ds[0].declaracao = 2;
  });
  conferir(
    'favorável com declaração 1 respondida "Não" IMPEDE',
    contradiz.some(
      (x) => x.bloco === 'parecerConclusivo' && x.severidade === 'IMPEDE' && x.titulo.includes('contraditório'),
    ),
    'dava para dizer "não houve cumprimento das cláusulas" e concluir favorável, sem um aviso',
  );
  conferir('e nomeia qual declaração', contradiz.some((x) => x.titulo.includes('declaração 1')));
  conferir(
    'lista todas as declarações negativas',
    rodar(1, (ds) => {
      ds[1].declaracao = 2;
      ds[4].declaracao = 2;
    }).some((x) => x.titulo.includes('declaração 2, 5')),
  );

  conferir(
    '"Favorável com ressalvas" com declaração "Não" NÃO é contradição',
    !rodar(2, (ds) => {
      ds[0].declaracao = 2;
    }).some((x) => x.titulo.includes('contraditório')),
    'é exatamente para isso que a ressalva existe',
  );
  conferir(
    'desfavorável com declaração "Não" é coerente',
    !rodar(3, (ds) => {
      ds[0].declaracao = 2;
    }).some((x) => x.titulo.includes('contraditório')),
  );

  /*
   * "Prejudicado" na declaração 4 é a resposta CERTA de quem não teve gasto com
   * pessoal. Tratá-lo como defeito transformaria a regra em ruído para toda
   * parceria sem folha.
   */
  conferir(
    '"Prejudicado" não é defeito',
    !rodar(1, (ds) => {
      ds[3].declaracao = 3;
    }).some((x) => x.titulo.includes('contraditório')),
  );

  /*
   * A 6 é "houve visita in loco": "Não" ali é omissão do concessor, não defeito
   * da entidade, e não contradiz a conclusão.
   */
  conferir(
    'visita in loco não realizada não contradiz a conclusão',
    !rodar(1, (ds) => {
      ds[5].declaracao = 2;
    }).some((x) => x.titulo.includes('contraditório')),
  );

  const comSancao = rodar(1, (ds) => {
    ds[6].declaracao = 1;
  });
  conferir(
    'sanção aplicada com parecer favorável sem ressalvas é aviso',
    comSancao.some((x) => x.bloco === 'parecerConclusivo' && x.titulo.includes('sanções')),
  );
  conferir(
    'mas não impede',
    !comSancao.some((x) => x.severidade === 'IMPEDE' && x.titulo.includes('sanções')),
    'a sanção pode ter sido aplicada e cumprida',
  );

  // --- o parecer contra o próprio painel
  const sobreOca = conferirPrestacao(comParecer(1, undefined, vazia()), ctxPadrao);
  conferir(
    'parecer favorável sobre prestação oca avisa, citando a contagem',
    sobreOca.some(
      (x) => x.bloco === 'parecerConclusivo' && /item\(ns\) que impede/.test(x.titulo),
    ),
  );
  conferir(
    'a contagem NÃO inclui o próprio parecer',
    (() => {
      const texto = sobreOca.find((x) => /item\(ns\) que impede/.test(x.titulo))?.titulo ?? '';
      const citado = Number(texto.match(/aponta (\d+) item/)?.[1] ?? -1);
      const reais = conferirPrestacao(vazia(), ctxPadrao).filter(
        (x) => x.severidade === 'IMPEDE',
      ).length;
      return citado === reais;
    })(),
    'senão o parecer contraditório entraria na conta como justificativa de si mesmo',
  );
  conferir(
    'parecer desfavorável sobre prestação oca não é incoerente',
    !conferirPrestacao(comParecer(3, undefined, vazia()), ctxPadrao).some((x) =>
      /item\(ns\) que impede/.test(x.titulo),
    ),
    'quem concluiu desfavorável já disse o que a conferência diz',
  );

  conferir(
    'prestação sem parecer preenchido não gera pendência de coerência',
    !conferirPrestacao(completa(), ctxPadrao).some((x) => x.bloco === 'parecerConclusivo'),
    'parecer ausente já é erro de schema — o bloco é obrigatório; repetir aqui seria duplicar',
  );
  conferir(
    'conclusão ainda em branco também não',
    !rodar(null).some((x) => x.bloco === 'parecerConclusivo'),
    'quem não respondeu ainda não se contradisse',
  );
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);

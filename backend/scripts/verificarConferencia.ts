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


console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);

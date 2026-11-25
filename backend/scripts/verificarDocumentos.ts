/**
 * Confere os documentos gerados (PC-02 e Termo de Ciência). Sem banco.
 *
 * O alvo é a **fidelidade ao modelo do TCESP**. Quem assina está assinando o
 * texto do Tribunal, não o nosso: uma cláusula "melhorada", um rótulo trocado
 * entre convenente e parceiro, e o documento deixa de ser o anexo oficial —
 * sem que nada na tela denuncie a diferença.
 *
 * Os trechos conferidos aqui foram lidos dos .docx oficiais (pasta
 * "Arquivos Relatórios"). Se o Tribunal publicar versão nova, é este script que
 * diz o que mudou de lugar.
 *
 *   npm run verificar:documentos
 */
import { montarTermoConsentimento } from '../src/core/documento/termoConsentimento';
import {
  montarTermoCiencia,
  pessoa,
  SEM_PESSOA,
  VOCABULARIO,
  type DadosTermoCiencia,
  type TipoAjusteTcn,
} from '../src/core/documento/termoCiencia';
import type { Folha } from '../src/core/documento/folha';
import {
  esferaDaFonte,
  linhaDaDespesa,
  montarDemonstrativoIntegral,
  VOCABULARIO_DEMONSTRATIVO,
  type DadosDemonstrativo,
} from '../src/core/documento/demonstrativoIntegral';
import { PLANO_PADRAO } from '../src/core/planoAplicacao/planoPadrao';
import { lerSaldo } from '../src/application/documento/DemonstrativoUseCase';

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};

/**
 * Espaço comum no lugar do não separável. O `toLocaleString` põe U+00A0 entre
 * "R$" e o número — que é o certo para impressão, porque não deixa a quebra de
 * linha separar o símbolo do valor —, e o teste não deve depender disso.
 */
const plano = (v: string | null) => v?.replace(/ /g, ' ') ?? null;

/** Todo o texto da folha, numa string só — para procurar trechos do modelo. */
const texto = (f: Folha) =>
  [
    f.titulo,
    f.subtitulo,
    ...f.cabecalho.map((c) => `${c.rotulo}: ${c.valor ?? ''}`),
    ...f.secoes.flatMap((s) => [s.titulo ?? '', ...s.itens]),
    ...f.assinaturas.flatMap((g) => [g.titulo, g.subtitulo ?? '']),
    ...f.notas,
  ].join('\n');

// --- PC-02 ------------------------------------------------------------------
console.log('\nANEXO PC-02 — Termo de Consentimento\n');
{
  const completo = montarTermoConsentimento({
    orgaoNome: 'PREFEITURA MUNICIPAL DE ITAJOBI',
    orgaoCnpj: '45131846000108',
    municipio: 'Itajobi',
    responsavelNome: 'Maria da Silva',
    responsavelCargo: 'Prefeita',
    responsavelCpf: '52998224725',
  });
  const t = texto(completo);

  conferir('título do modelo', completo.titulo === 'ANEXO PC-02 - TERMO DE CONSENTIMENTO');
  for (const trecho of [
    'AUTORIZAMOS de forma expressa:',
    'de todos os CNPJs vinculados a este órgão',
    '“Dígito Verificador da Conta”',
    'ESTAMOS CIENTES:',
    'somente aos dados das contas de recursos públicos',
    // O erro de grafia é do modelo oficial — e fica, pela mesma razão do resto.
    'objetivos instituicionais previstos em lei',
    'perdurando por prazo indeterminado.',
  ])
    conferir(`cláusula do modelo: "${trecho}"`, t.includes(trecho));

  conferir('CPF sai mascarado', t.includes('529.982.247-25'));
  conferir('CNPJ do órgão sai mascarado', t.includes('45.131.846/0001-08'));
  conferir('local vem do município', completo.localEData.startsWith('Itajobi, '));
  conferir('completo: nada faltando', completo.faltando.length === 0);

  const vazio = montarTermoConsentimento({
    orgaoNome: 'CÂMARA MUNICIPAL DE ITAJOBI',
    orgaoCnpj: null,
    municipio: null,
    responsavelNome: null,
    responsavelCargo: null,
    responsavelCpf: null,
  });
  conferir(
    'sem responsável, a folha sai mesmo assim',
    vazio.assinaturas.length === 1 && vazio.cabecalho[1].valor === null,
    'documento é o fim do caminho — travá-lo obrigaria a voltar sem saber o que falta',
  );
  conferir(
    'e diz onde preencher',
    vazio.faltando.some((f) => f.includes('Órgãos Concessores')),
  );
  conferir('sem município, o rótulo do modelo', vazio.localEData === 'LOCAL e DATA:');
}

// --- Termo de Ciência ---------------------------------------------------------
console.log('\nTermo de Ciência e de Notificação\n');

const base = (tipo: TipoAjusteTcn, over: Partial<DadosTermoCiencia> = {}): DadosTermoCiencia => ({
  tipoAjuste: tipo,
  orgaoNome: 'PREFEITURA MUNICIPAL DE ITAJOBI',
  municipio: 'Itajobi',
  entidadeNome: 'ASSOCIAÇÃO BENEFICENTE',
  numeroAjuste: '012/2026',
  objeto: 'Atendimento a idosos',
  valorAjuste: 1_250_000,
  valorRepassado: null,
  exercicio: null,
  autoridadeOrgao: pessoa('Maria da Silva', 'Prefeita', '52998224725', 'Cadastro do Órgão Concessor'),
  ordenadorOrgao: pessoa('João Souza', 'Secretário de Saúde', '11144477735', 'Cadastro do Órgão Concessor'),
  autoridadeEntidade: pessoa('Ana Lima', 'Presidente', '39053344705', 'Diretoria da entidade'),
  responsavelAjuste: pessoa('Paulo Reis', 'Gestor da Parceria', '15350946056', 'Responsável pelo Ajuste'),
  ...over,
});

/*
 * O vocabulário de cada anexo, lido dos .docx. Um rótulo trocado entre tipos
 * é o defeito mais provável e o mais invisível: o documento continua bonito,
 * só que é o anexo de outra modalidade.
 */
const ESPERADO: Record<TipoAjusteTcn, { anexo: string; orgao: string; entidade: string; clausula: string }> = {
  CONTRATO_GESTAO: { anexo: 'RP-05', orgao: 'CONTRATANTE', entidade: 'CONTRATADA', clausula: 'pela contratante e contratada' },
  CONVENIO: { anexo: 'RP-11', orgao: 'ÓRGÃO PÚBLICO CONVENENTE', entidade: 'ENTIDADE CONVENIADA', clausula: 'pelo órgão público convenente e entidade conveniada' },
  TERMO_PARCERIA: { anexo: 'RP-07', orgao: 'ÓRGÃO PÚBLICO PARCEIRO', entidade: 'ENTIDADE PARCEIRA', clausula: 'pelo órgão concessor e entidade beneficiária' },
  TERMO_COLABORACAO: { anexo: 'RP-09', orgao: 'ÓRGÃO/ENTIDADE PÚBLICO(A)', entidade: 'ORGANIZAÇÃO DA SOCIEDADE CIVIL PARCEIRA', clausula: 'pelo órgão concessor e entidade beneficiária' },
  TERMO_FOMENTO: { anexo: 'RP-09', orgao: 'ÓRGÃO/ENTIDADE PÚBLICO(A)', entidade: 'ORGANIZAÇÃO DA SOCIEDADE CIVIL PARCEIRA', clausula: 'pelo órgão concessor e entidade beneficiária' },
};

for (const tipo of Object.keys(ESPERADO) as TipoAjusteTcn[]) {
  const e = ESPERADO[tipo];
  const f = montarTermoCiencia(base(tipo));
  const t = texto(f);
  conferir(
    `${tipo}: anexo ${e.anexo}, "${e.orgao}" / "${e.entidade}"`,
    f.anexo === e.anexo &&
      f.titulo === `ANEXO ${e.anexo} - TERMO DE CIÊNCIA E DE NOTIFICAÇÃO` &&
      f.cabecalho[0].rotulo === e.orgao &&
      f.cabecalho[1].rotulo === e.entidade,
  );
  conferir(`${tipo}: quarta cláusula com o vocabulário do anexo`, t.includes(`responsável(is) ${e.clausula},`));
}

conferir(
  'Colaboração e Fomento são o mesmo anexo',
  JSON.stringify(VOCABULARIO.TERMO_COLABORACAO) === JSON.stringify(VOCABULARIO.TERMO_FOMENTO),
  'o RP-09 é um só, intitulado "TERMO DE COLABORAÇÃO/FOMENTO"',
);

{
  const f = montarTermoCiencia(base('CONVENIO'));
  const t = texto(f);

  /*
   * O corpo é idêntico nos quatro anexos. Estes trechos identificam cada uma
   * das oito cláusulas — se uma sumir ou for reescrita, aparece aqui.
   */
  for (const trecho of [
    'estarão sujeitos a análise e julgamento pelo Tribunal de Contas do Estado de São Paulo',
    'Resolução nº 01/2011 do TCESP',
    '(https://doe.tce.sp.gov.br/)',
    'artigo 90 da Lei Complementar nº 709, de 14 de janeiro de 1993',
    '“Cadastro Corporativo TCESP – CadTCESP”',
    'Artigo 2º das Instruções nº01/2024',
    'Damo-nos por NOTIFICADOS para:',
    'até seu julgamento final e consequente publicação;',
    'interpor recursos e o que mais couber;',
    'inciso II do artigo 30 da Lei Complementar nº 709',
    'conforme §1º do artigo 30 da citada Lei.',
  ])
    conferir(`cláusula do modelo: "${trecho}"`, t.includes(trecho));

  conferir(
    'oito cláusulas, em dois grupos de quatro',
    f.secoes.filter((s) => s.numerada).map((s) => s.itens.length).join(',') === '4,4',
  );
  conferir('três notas de rodapé: (1), (2) e (*)', f.notas.map((n) => n.slice(0, 3)).join(' ') === '(1) (2) (*)');

  /*
   * Os quatro signatários obrigatórios. É o defeito clássico do termo: voltar
   * do Tribunal assinado só pelo prefeito.
   */
  const nomes = f.assinaturas.flatMap((g) => g.pessoas.map((p) => p.nome));
  conferir(
    'autoridade, ordenador, presidente e gestor estão todos na folha',
    ['Maria da Silva', 'João Souza', 'Ana Lima', 'Paulo Reis'].every((n) => nomes.includes(n)),
  );
  conferir(
    'toda pessoa preenchida diz de onde veio',
    f.assinaturas.flatMap((g) => g.pessoas).every((p) => !p.nome || p.origem),
    'quem assina precisa poder conferir se o sistema pegou a pessoa certa',
  );
  conferir(
    'sempre sobra linha para quem o sistema não conhece',
    f.assinaturas.find((g) => g.titulo.startsWith('DEMAIS'))!.linhasEmBranco >= 1,
  );
  conferir('completo: nada faltando', f.faltando.length === 0);

  conferir(
    'termo da formalização leva o valor do ajuste e exercício em branco',
    plano(f.cabecalho[4].valor) === 'R$ 1.250.000,00' && f.cabecalho[5].valor === null,
  );
  conferir('advogado sempre em branco (facultativo)', f.cabecalho[6].valor === null);
}

{
  const f = montarTermoCiencia(base('CONVENIO', { exercicio: 2026, valorRepassado: 300_000 }));
  conferir(
    'termo da prestação leva o valor REPASSADO e o exercício',
    plano(f.cabecalho[4].valor) === 'R$ 300.000,00' && f.cabecalho[5].valor === '2026',
    'é o que a nota (1) do modelo determina',
  );
}

{
  const f = montarTermoCiencia(
    base('TERMO_COLABORACAO', {
      autoridadeOrgao: SEM_PESSOA,
      ordenadorOrgao: pessoa('João Souza', 'Secretário', null, 'Cadastro do Órgão Concessor'),
      autoridadeEntidade: SEM_PESSOA,
    }),
  );
  conferir('sem dados, a folha sai mesmo assim', f.assinaturas.length === 6);
  conferir(
    'aponta a autoridade do órgão que falta',
    f.faltando.some((x) => x.startsWith('Autoridade máxima do órgão')),
  );
  conferir(
    'aponta o CPF que falta, não a pessoa inteira',
    f.faltando.some((x) => x.startsWith('CPF ordenador de despesa do órgão')),
  );
  conferir(
    'e diz onde cadastrar o presidente da entidade',
    f.faltando.some((x) => x.includes('aba Diretoria')),
  );
}

// --- Demonstrativo Integral ----------------------------------------------------
console.log('\nDemonstrativo Integral das Receitas e Despesas\n');
{
  conferir(
    'esfera da fonte: 5/95 federal, 2/92 estadual, o resto municipal',
    esferaDaFonte(5) === 'FEDERAL' && esferaDaFonte(95) === 'FEDERAL' &&
      esferaDaFonte(2) === 'ESTADUAL' && esferaDaFonte(92) === 'ESTADUAL' &&
      [1, 3, 4, 6, 7, 8, 91, 98].every((f) => esferaDaFonte(f) === 'MUNICIPAL'),
  );

  /*
   * As 16 categorias do plano padrão caem cada uma na sua linha do anexo. O
   * mapa é posicional por dentro; este teste é o que o impede de escorregar
   * uma casa quando alguém reordenar o plano.
   */
  const esperado: Record<string, string> = {
    'Recursos Humanos': 'RH_PESSOAL',
    'Recursos Humanos (terceiros)': 'RH_TERCEIROS',
    'Serviços Médicos': 'SERVICOS_MEDICOS',
    Medicamentos: 'MEDICAMENTOS',
    'Materiais Médico-Hospitalares': 'MATERIAL_MEDICO',
    'Gêneros Alimentícios': 'GENEROS',
    Combustível: 'COMBUSTIVEL',
    'Outros Materiais de Consumo': 'OUTROS_MATERIAIS',
    'Outros Serviços de Terceiros': 'OUTROS_SERVICOS',
    'Locação de Imóveis': 'LOCACAO_IMOVEIS',
    'Locações Diversas': 'LOCACOES_DIVERSAS',
    'Utilidades Públicas': 'UTILIDADES',
    'Bens e Materiais Permanentes': 'BENS_PERMANENTES',
    Obras: 'OBRAS',
    'Despesas Financeiras e Bancárias': 'DESPESAS_FINANCEIRAS',
    'Outras Despesas': 'OUTRAS',
  };
  const errados = PLANO_PADRAO.filter(
    (g) => linhaDaDespesa({ folha: false, propostaCategoria: g.categoria, categoriaDespesaTipo: null }) !== esperado[g.categoria],
  ).map((g) => g.categoria);
  conferir('cada categoria do plano padrão vai à sua linha do anexo', errados.length === 0, errados.join(', '));
  conferir(
    'sem Item da Proposta, a categoria Audesp decide',
    linhaDaDespesa({ folha: false, propostaCategoria: null, categoriaDespesaTipo: 34 }) === 'MEDICAMENTOS' &&
      linhaDaDespesa({ folha: false, propostaCategoria: null, categoriaDespesaTipo: 72 }) === 'UTILIDADES' &&
      linhaDaDespesa({ folha: false, propostaCategoria: null, categoriaDespesaTipo: 61 }) === 'OBRAS' &&
      linhaDaDespesa({ folha: false, propostaCategoria: null, categoriaDespesaTipo: 20 }) === 'LOCACAO_IMOVEIS',
  );
  conferir(
    'folha de pagamento é sempre RH (5)',
    linhaDaDespesa({ folha: true, propostaCategoria: 'Obras', categoriaDespesaTipo: 61 }) === 'RH_PESSOAL',
  );
  conferir(
    'código desconhecido cai em "Outras despesas", nunca some',
    linhaDaDespesa({ folha: false, propostaCategoria: 'Rubrica própria', categoriaDespesaTipo: 999 }) === 'OUTRAS',
  );

  const base = (over: Partial<DadosDemonstrativo> = {}): DadosDemonstrativo => ({
    tipoAjuste: 'CONVENIO',
    exercicio: 2026,
    orgaoNome: 'PREFEITURA MUNICIPAL DE ITAJOBI',
    municipio: 'Itajobi',
    entidade: { nome: 'ASSOCIAÇÃO BENEFICENTE', cnpj: '11222333000181', endereco: 'Rua A, 1' },
    responsavel: { nome: 'Ana Lima', cargo: 'Presidente', cpf: '390.533.447-05' },
    objeto: 'Atendimento a idosos',
    instrumentos: [{ documento: 'Termo de Convênio nº 12/2026', data: '2026-01-10', vigencia: null, valor: 120000 }],
    esferasDoAjuste: ['MUNICIPAL'],
    repasses: [
      // Previsto em dezembro do ano anterior e pago agora: lista e soma em B.
      { dataPrevista: '2025-12-20', valorPrevisto: 10000, dataRepasse: '2026-01-15', numeroDocumento: 'TED 1', valorRepasse: 10000, fonte: 1 },
      { dataPrevista: '2026-06-20', valorPrevisto: 10000, dataRepasse: '2026-06-22', numeroDocumento: 'TED 2', valorRepasse: 9000, fonte: null },
    ],
    receitas: [
      { tipo: 'APLIC_FINANC_MUNICIPAL', fonte: null, valor: 100 },
      { tipo: 'OUTRA', fonte: null, valor: 50 },
      { tipo: 'RECURSO_PROPRIO', fonte: null, valor: 200 },
      // Repasse do Financeiro é ignorado: vem do bloco Repasses.
      { tipo: 'REPASSE_RECEBIDO', fonte: 1, valor: 99999 },
    ],
    saldoAnterior: { porEsfera: { MUNICIPAL: 1000 }, semEsfera: 0, origem: null },
    notas: [
      // Emitida e paga no ano: contabilizada, (I).
      { id: 'n1', dataEmissao: '2026-02-01', valorContabil: 5000, linha: 'RH_PESSOAL', pagamentos: [{ data: '2026-02-05', valor: 5000, fonte: 1 }] },
      // Emitida no ano anterior, paga agora: (H).
      { id: 'n2', dataEmissao: '2025-12-10', valorContabil: 800, linha: 'MEDICAMENTOS', pagamentos: [{ data: '2026-01-08', valor: 800, fonte: 1 }] },
      // Emitida no ano, metade paga: contabilizada, (I) parcial, a pagar.
      { id: 'n3', dataEmissao: '2026-11-01', valorContabil: 2000, linha: 'MEDICAMENTOS', pagamentos: [{ data: '2026-11-20', valor: 1000, fonte: 1 }] },
    ],
    devolucoes: [{ valor: 30 }],
    ...over,
  });

  const r = montarDemonstrativoIntegral(base());
  const m = r.anexos[0];
  conferir('ajuste de uma esfera: um anexo só, municipal', r.anexos.length === 1 && m.esfera === 'MUNICIPAL');
  conferir('Convênio é o RP-12', r.anexo === 'RP-12');
  conferir('(A) vem do saldo anterior', m.A === 1000);
  conferir(
    '(B) soma o que entrou no ano — inclusive a parcela prevista no ano anterior',
    m.B === 19000 && m.repasses.length === 2,
    'nota (2) do modelo',
  );
  conferir('repasse sem fonte, em ajuste de esfera única, entra na esfera dele', m.repasses.some((x) => x.numeroDocumento === 'TED 2'));
  conferir('(C) rendimentos, (D) outras, (F) próprios', m.C === 100 && m.D === 50 && m.F === 200);
  conferir('repasse lançado no Financeiro não é somado duas vezes', m.B === 19000);
  conferir('(E) = A + B + C + D', m.E === 20150);
  conferir('(G) = E + F', m.G === 20350);

  const t = m.totalDespesas;
  conferir('contabilizadas no exercício: n1 + n3', t.contabilizadas === 7000);
  conferir('(H) contabilizada antes, paga agora: n2', t.anterioresPagas === 800);
  conferir('(I) contabilizada e paga no exercício: n1 + metade de n3', t.contabilizadasPagas === 6000);
  conferir('(J) = H + I', t.totalPago === 6800 && m.J === 6800);
  conferir('a pagar: o resto de n3', t.aPagar === 1000);
  const med = m.despesas.find((x) => x.id === 'MEDICAMENTOS')!;
  conferir('por linha: medicamentos junta n2 e n3', med.contabilizadas === 2000 && med.anterioresPagas === 800 && med.aPagar === 1000);
  conferir('as 16 linhas, na ordem do anexo', m.despesas.length === 16 && m.despesas[0].rotulo === 'Recursos humanos (5)' && m.despesas[15].rotulo === 'Outras despesas');
  conferir('(K) = E − (J − F)', m.K === 20150 - (6800 - 200));
  conferir('(L) devolução, (M) = K − L', m.L === 30 && m.M === m.K - 30);
  conferir('completo: nada faltando', r.faltando.length === 0, r.faltando.join(' | '));

  // --- duas esferas
  const duas = montarDemonstrativoIntegral(
    base({
      esferasDoAjuste: ['FEDERAL', 'MUNICIPAL'],
      repasses: [
        { dataPrevista: '2026-03-01', valorPrevisto: 5000, dataRepasse: '2026-03-02', numeroDocumento: 'F1', valorRepasse: 5000, fonte: 5 },
        { dataPrevista: '2026-03-01', valorPrevisto: 3000, dataRepasse: '2026-03-02', numeroDocumento: 'M1', valorRepasse: 3000, fonte: 1 },
        { dataPrevista: '2026-04-01', valorPrevisto: 700, dataRepasse: '2026-04-02', numeroDocumento: '?', valorRepasse: 700, fonte: null },
      ],
      receitas: [{ tipo: 'APLIC_FINANC_FEDERAL', fonte: null, valor: 40 }],
      saldoAnterior: { porEsfera: {}, semEsfera: 0, origem: null },
      notas: [
        // Paga meio a meio pelas duas fontes: divide-se.
        { id: 'x', dataEmissao: '2026-05-01', valorContabil: 1000, linha: 'OBRAS', pagamentos: [
          { data: '2026-05-10', valor: 500, fonte: 5 },
          { data: '2026-05-10', valor: 500, fonte: 1 },
        ] },
        // Não paga, e o ajuste tem duas esferas: não há de onde tirar a fonte.
        { id: 'y', dataEmissao: '2026-06-01', valorContabil: 300, linha: 'OUTRAS', pagamentos: [] },
      ],
      devolucoes: [],
    }),
  );
  const fed = duas.anexos.find((a) => a.esfera === 'FEDERAL');
  const mun = duas.anexos.find((a) => a.esfera === 'MUNICIPAL');
  conferir('ajuste federal + municipal: dois anexos', duas.anexos.length === 2 && !!fed && !!mun);
  conferir('cada repasse no anexo da sua fonte', fed?.B === 5000 && mun?.B === 3000);
  conferir('rendimento federal no anexo federal, pelo tipo', fed?.C === 40 && mun?.C === 0);
  conferir(
    'nota paga por duas fontes divide-se na proporção do que cada uma pagou',
    fed?.despesas.find((x) => x.id === 'OBRAS')?.contabilizadas === 500 &&
      mun?.despesas.find((x) => x.id === 'OBRAS')?.contabilizadas === 500,
  );
  conferir(
    'sem fonte e com duas esferas: fica FORA dos anexos, e não dividida por palpite',
    !duas.anexos.some((a) => a.despesas.find((x) => x.id === 'OUTRAS')!.contabilizadas > 0) &&
      !duas.anexos.some((a) => a.repasses.some((x) => x.numeroDocumento === '?')),
  );
  conferir(
    'e o que ficou fora é dito, com o valor',
    duas.faltando.some((f) => f.includes('despesa sem fonte de recurso') && f.includes('300,00') && f.includes('repasse sem fonte')),
  );

  // --- saldo anterior
  conferir(
    'saldo anterior desconhecido é dito ao usuário',
    montarDemonstrativoIntegral(base({ saldoAnterior: { porEsfera: {}, semEsfera: 0, origem: 'Não há prestação de 2025' } })).faltando.some((f) =>
      f.startsWith('Não há prestação'),
    ),
  );
  const informado = lerSaldo('MUNICIPAL:1.500,50;FEDERAL:0');
  conferir('saldo informado na tela é lido no formato brasileiro', informado?.MUNICIPAL === 1500.5 && informado?.FEDERAL === 0);
  conferir('saldo vazio não substitui nada', lerSaldo('') === null && lerSaldo(undefined) === null);
  let recusou = false;
  try {
    lerSaldo('LUNAR:10');
  } catch {
    recusou = true;
  }
  conferir('esfera inventada é recusada', recusou);

  // --- vocabulário, lido dos .docx
  const vocab: Record<string, [string, string, string]> = {
    CONTRATO_GESTAO: ['RP-06', 'CONTRATANTE', 'Órgão Público Contratante'],
    CONVENIO: ['RP-12', 'ÓRGÃO PÚBLICO CONVENENTE', 'Órgão Público Convenente'],
    TERMO_PARCERIA: ['RP-08', 'ÓRGÃO PÚBLICO PARCEIRO', 'Órgão Público Parceiro'],
    TERMO_COLABORACAO: ['RP-10', 'ÓRGÃO PÚBLICO', 'Órgão Público Parceiro'],
    TERMO_FOMENTO: ['RP-10', 'ÓRGÃO PÚBLICO', 'Órgão Público Parceiro'],
  };
  for (const [tipo, [anexo, orgao, decl]] of Object.entries(vocab)) {
    const x = montarDemonstrativoIntegral(base({ tipoAjuste: tipo as DadosDemonstrativo['tipoAjuste'] }));
    conferir(
      `${tipo}: ${anexo}, "${orgao}", declaração proposta ao ${decl}`,
      x.anexo === anexo && x.vocabulario.rotuloOrgao === orgao && x.textos.declaracao.endsWith(`proposto ao ${decl}.`),
    );
  }
  conferir(
    'só o Contrato de Gestão tem "Entidade gerenciada" e a vírgula a mais',
    VOCABULARIO_DEMONSTRATIVO.CONTRATO_GESTAO.rotuloGerenciada !== null &&
      montarDemonstrativoIntegral(base({ tipoAjuste: 'CONTRATO_GESTAO' })).textos.signatario.includes('2026, bem como') &&
      r.textos.signatario.includes('2026 bem como'),
  );
  conferir('seis notas numeradas, de (4) a (9), mais a da saúde, no quadro de despesas', r.textos.notasDespesas.length === 7);
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);

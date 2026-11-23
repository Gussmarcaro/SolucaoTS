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

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);

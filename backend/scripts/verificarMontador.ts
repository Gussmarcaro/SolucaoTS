/**
 * Confronta o documento produzido pelo montador com o JSON Schema oficial.
 *
 *   npm run verificar:montador
 *
 * Monta um `DadosMontagem` sintético com **todos** os blocos preenchidos e um
 * item em cada lista, roda `montarPrestacao` e valida o resultado com o mesmo
 * Ajv usado em produção, para cada tipo de ajuste. Assim um campo obrigatório
 * que o montador não emite aparece aqui, e não na rejeição do TCESP.
 *
 * Não precisa de banco: é tudo em memória.
 */
import { montarPrestacao } from '../src/application/montador/montarPrestacao';
import type { DadosMontagem, PublicacaoMontagem } from '../src/application/montador/tipos';
import { AjvValidadorSchema } from '../src/infrastructure/tcesp/AjvValidadorSchema';

const publicacao: PublicacaoMontagem = {
  tipoVeiculo: 1,
  nomeVeiculo: 'Diário Oficial',
  dataPublicacao: '2025-03-10',
  enderecoInternet: 'https://exemplo.gov.br/publicacao',
};

const periodos = [{ mes: 1, cargaHoraria: 40, remuneracaoBruta: 3500.5 }];

function dados(tipoAjuste: string): DadosMontagem {
  return {
    ano: 2025,
    mes: 12,
    ehRetificacao: false,
    tipoAjuste,
    codigoAjuste: '2025000000000001',
    municipio: 7107,
    entidade: 10048,
    valorAtualizadoAjuste: 1000000,

    empregados: [
      { cpf: '00000000191', dataAdmissao: '2025-01-02', dataDemissao: null, cbo: '225125', cns: '000000000000000', salarioContratual: 5000, periodos },
    ],
    bens: [
      { categoria: 'MOVEL_ADQUIRIDO', numeroPatrimonio: 'PAT-1', descricao: 'Computador', data: '2025-02-01', valor: 4200 },
      { categoria: 'MOVEL_CEDIDO', numeroPatrimonio: 'PAT-2', descricao: 'Mesa', data: '2025-02-02', valor: 800 },
      { categoria: 'MOVEL_BAIXADO', numeroPatrimonio: 'PAT-3', descricao: 'Cadeira', data: '2025-02-03', valor: null },
      { categoria: 'IMOVEL_ADQUIRIDO', numeroPatrimonio: null, descricao: 'Sala', data: '2025-02-04', valor: null },
      { categoria: 'IMOVEL_CEDIDO', numeroPatrimonio: null, descricao: 'Galpão', data: '2025-02-05', valor: null },
      { categoria: 'IMOVEL_BAIXADO', numeroPatrimonio: null, descricao: 'Depósito', data: '2025-02-06', valor: null },
    ],
    documentosFiscais: [
      { numero: '0987654321', credorTipoDoc: 'CNPJ', credorNumeroDoc: '00000000000191', credorNome: 'Fornecedor SA', descricao: 'Serviços', dataEmissao: '2025-03-01', estadoEmissor: 26, valorBruto: 1000, valorEncargos: 100, categoriaDespesaTipo: 8, rateioProveniente: true, rateioPercentual: 50 },
    ],
    pagamentos: [
      { folha: false, docNumero: '0987654321', docCredorTipo: 'CNPJ', docCredorNumero: '00000000000191', dataPagamento: '2025-03-15', valor: 900, fonteRecursoTipo: 1, meioPagamento: 'BANCO', banco: 1, agencia: 1234, contaCorrente: '5678X', numeroTransacao: '001ABC' },
    ],
    receitas: [
      { tipo: 'REPASSE_RECEBIDO', descricao: null, dataPrevista: '2025-01-10', dataRepasse: '2025-01-15', fonteRecursoTipo: 1, valor: 50000 },
      { tipo: 'APLIC_FINANC_MUNICIPAL', descricao: null, dataPrevista: null, dataRepasse: null, fonteRecursoTipo: null, valor: 120.55 },
      { tipo: 'OUTRA', descricao: 'Doação', dataPrevista: null, dataRepasse: null, fonteRecursoTipo: null, valor: 300 },
      { tipo: 'RECURSO_PROPRIO', descricao: 'Mensalidades', dataPrevista: null, dataRepasse: null, fonteRecursoTipo: null, valor: 700 },
    ],
    disponibilidades: [
      { banco: 1, agencia: 1234, conta: '5678X', contaTipo: 1, saldoBancario: 2500.75, saldoContabil: 2500.75 },
    ],
    saldoFundoFixo: 150.5,
    descontos: [{ data: '2025-04-01', descricao: 'Desconto', valor: 150 }],
    devolucoes: [{ data: '2025-05-01', naturezaDevolucaoTipo: 1, valor: 200 }],
    glosas: [
      { docNumero: '0987654321', docCredorTipo: 'CNPJ', docCredorNumero: '00000000000191', pagamentoData: null, resultadoAnalise: 'APROVADO_PARCIALMENTE', valorGlosa: 50 },
    ],
    empenhos: [
      { numero: '1234567890', dataEmissao: '2025-01-05', classificacaoEconomica: '33903900', fonteRecursoTipo: 1, valor: 60000, historico: 'Repasse anual', cpfOrdenadorDespesa: '00000000191' },
    ],
    repasses: [
      { empenhoNumero: '1234567890', empenhoDataEmissao: '2025-01-05', dataPrevista: '2025-01-10', dataRepasse: '2025-01-15', valorPrevisto: 50000, valorRepasse: 50000, justificativaDiferenca: null, tipoDocumentoBancario: 1, descricaoOutros: null, numeroDocumento: 'OB-123', banco: 1, agencia: 1234, conta: '5678X' },
    ],
    servidores: [
      { cpf: '00000000191', dataInicialCessao: '2025-01-02', dataFinalCessao: null, cargoPublico: 'Analista', funcaoEntidade: 'Coordenador', onusPagamento: 1, periodos },
    ],
    atividades: [
      { nomePrograma: 'Programa A', codigoMeta: 'M1', periodo: 1, quantidadeRealizada: 10, resultadoMeta: 'CUMPRIDA', justificativaPeriodo: null, metaAtendida: true, justificativaMeta: null },
    ],

    dadosGerais: {
      identCertidaoDadosGerais: '1000000001',
      identCertidaoCorpoDiretivo: '1000000002',
      identCertidaoMembrosConselho: '1000000003',
      identCertidaoResponsaveis: '1000000004',
    },
    responsaveis: {
      identCertidaoResponsaveis: '1000000005',
      identCertidaoComissaoAvaliacao: '1000000006',
      identCertidaoControleInterno: '1000000007',
      identCertidaoFiscalizacaoExecucao: '1000000008',
    },
    declaracoesBloco: {
      houveContratacao: true,
      empresasPertencentes: [{ cnpj: '00000000000191', cpf: '00000000191' }],
      houveParticipacao: true,
      participacoes: [{ cpfDirigente: '00000000191', cpfsContratados: ['00000000272'] }],
      comprasAdequadas: true,
    },
    parecer: {
      identificacaoParecer: '1000000009',
      conclusaoParecer: 1,
      consideracoesParecer: 'Sem ressalvas',
      // A declaração 7 ("houve aplicação de sanções?") exige justificativa se
      // for "Sim"; aqui responde "Não" para o caso base ficar íntegro.
      declaracoes: Array.from({ length: 7 }, (_, i) => ({
        tipoDeclaracao: i + 1,
        declaracao: i + 1 === 7 ? 2 : 1,
        justificativa: i + 1 === 7 ? 'Não houve aplicação de sanções.' : null,
      })),
    },
    transparencia: {
      mantemSitio: true,
      sitios: ['https://entidade.org.br'],
      requisitos781: Array.from({ length: 8 }, (_, i) => ({ requisito: i + 1, atende: true })),
      requisitos83: Array.from({ length: 6 }, (_, i) => ({ requisito: i + 1, atende: true })),
      requisitosDivulgacao: Array.from({ length: 10 }, (_, i) => ({ requisito: i + 1, atende: true })),
    },
    demonstracoes: { publicacoes: [publicacao], respNumeroCrc: '1SP123456', respCpf: '00000000191', respSituacaoRegular: true },
    publicacaoParecerAta: {
      itens: [{ tipoParecerAta: 1, houvePublicacao: true, publicacoes: [publicacao], conclusaoParecer: 1 }],
    },
    publicacaoRelAtividades: { houvePublicacaoExercicio: true, publicacoes: [publicacao] },
    prestacaoEntidade: { dataPrestacao: '2026-03-01', periodoReferenciaInicial: '2025-01-01', periodoReferenciaFinal: '2025-12-31' },
    relatorioFinal: { houveEmissao: true, conclusao: 1, justificativa: null },
    regulamentoCompras: {
      houvePublicacaoInicial: true,
      publicacoesInicial: [publicacao],
      houveAlteracao: false,
      houvePublicacaoAlterado: null,
      publicacoesAlteracao: [],
    },
    extratoFisicoFinanceiro: { haExtrato: true, extratoConformeModelo: true, publicacoes: [publicacao] },
    termoBensCedidos: { termoCessaoPermissao: true },

    contratos: [
      { numero: '1234657890', credorTipoDoc: 'CNPJ', credorNumeroDoc: '00000000000191', credorNome: 'Fornecedor SA', dataAssinatura: '2024-12-01', vigenciaTipo: 'PRE_ESTABELECIDA', vigenciaDataInicial: '2025-01-01', vigenciaDataFinal: '2025-12-31', objeto: 'Objeto', naturezaContratacao: [23], naturezaOutro: 'Outros serviços', criterioSelecao: 4, criterioSelecaoOutro: 'Outro critério', artigoRegulamentoCompras: 'Art. 1', valorMontante: 120000, valorTipo: 1 },
    ],
    ajustesSaldo: {
      retificacaoRepasses: [{ dataPrevista: '2024-01-10', dataRepasse: '2024-01-15', fonteRecursoTipo: 1, valorRetificado: 100 }],
      inclusaoRepasses: [{ dataPrevista: '2024-02-10', dataRepasse: '2024-02-15', valor: 200, fonteRecursoTipo: 1 }],
      retificacaoPagamentos: [{ docNumero: '111', docCredorTipo: 2, docCredorNumero: '00000000000191', pagamentoData: '2024-03-01', pagamentoValor: 300, fonteRecursoTipo: 1, valorRetificado: 250 }],
      inclusaoPagamentos: [{ docNumero: '222', docCredorTipo: 2, docCredorNumero: '00000000000191', pagamentoData: '2024-04-01', pagamentoValor: 400, fonteRecursoTipo: 1, meioPagamento: 1, banco: 1, agencia: 1234, contaCorrente: '5678X', numeroTransacao: '002ABC' }],
    },
  };
}

const TIPOS = ['CONTRATO_GESTAO', 'CONVENIO', 'TERMO_COLABORACAO', 'TERMO_FOMENTO', 'TERMO_PARCERIA'];

const validador = new AjvValidadorSchema();
let comProblema = 0;

for (const tipo of TIPOS) {
  const { documento } = montarPrestacao(dados(tipo));
  const r = validador.validar(tipo, documento);

  if (!r.validado) {
    console.log(`\n${tipo}: NÃO VALIDADO — ${r.motivo ?? 'motivo desconhecido'}`);
    comProblema++;
    continue;
  }
  if (r.erros.length === 0) {
    console.log(`\n${tipo}: documento conforme o schema ✓`);
    continue;
  }
  comProblema++;
  console.log(`\n${tipo}: ${r.erros.length} problema(s) estrutural(is)`);
  for (const e of r.erros) console.log('   ' + e.replace('Schema do TCESP — ', ''));
}

console.log(
  comProblema === 0
    ? '\nTodos os tipos de ajuste produzem documento conforme o schema.'
    : `\n${comProblema} tipo(s) de ajuste com problema.`,
);

// ---------------------------------------------------------------------------
// Contraprova das regras de negócio: cada quebra abaixo TEM de gerar erro.
// Sem isso, uma validação que parou de funcionar passaria despercebida.
// ---------------------------------------------------------------------------
console.log('\n--- Regras de negócio (cada caso deve ser barrado) ---');

const HOJE = new Date('2026-08-07T00:00:00Z');

const casos: Array<[string, (d: DadosMontagem) => void, string]> = [
  ['emissão de documento fiscal no futuro', (d) => { d.documentosFiscais[0].dataEmissao = '2027-01-01'; }, 'não pode ser futura'],
  ['pagamento fora do exercício', (d) => { d.pagamentos[0].dataPagamento = '2024-03-15'; }, 'dentro do exercício'],
  ['desconto acima do valor do ajuste', (d) => { d.descontos[0].valor = 9_999_999; }, 'menor que o valor atualizado'],
  ['devolução com valor zero', (d) => { d.devolucoes[0].valor = 0; }, 'maior que zero'],
  ['glosa parcial maior que o bruto do documento', (d) => { d.glosas[0].valorGlosa = 5000; }, 'menor que o valor bruto'],
  ['repasse anterior à emissão do empenho', (d) => { d.repasses[0].dataRepasse = '2024-12-01'; }, 'anterior à emissão do empenho'],
  ['previsto do repasse acima do empenho', (d) => { d.repasses[0].valorPrevisto = 70_000; }, 'não pode superar o valor do empenho'],
  ['soma dos repasses acima do empenho', (d) => { d.repasses.push({ ...d.repasses[0], valorRepasse: 30_000, valorPrevisto: 30_000, justificativaDiferenca: null }); }, 'supera o valor do empenho'],
  ['emissão de empenho no futuro', (d) => { d.empenhos[0].dataEmissao = '2027-01-01'; }, 'não pode ser futura'],
  ['assinatura de contrato há mais de 20 anos', (d) => { d.contratos[0].dataAssinatura = '1990-01-01'; }, 'data de assinatura'],
  ['vigência inicial muito no futuro', (d) => { d.contratos[0].vigenciaDataInicial = '2035-01-01'; }, 'início da vigência'],
  ['vigência acima de 10 anos', (d) => { d.contratos[0].vigenciaDataFinal = '2040-01-01'; }, 'não pode passar de 10 anos'],
  ['empresa contratada sem o CPF do dirigente', (d) => { d.declaracoesBloco!.empresasPertencentes[0].cpf = null; }, 'CPF do dirigente'],
  ['identificação de certidão fora do formato', (d) => { d.dadosGerais!.identCertidaoDadosGerais = '123'; }, '10 dígitos'],
  ['CBO de médico sem CNS', (d) => { d.empregados[0].cns = null; }, 'CNS é obrigatório'],
];

let naoBarrados = 0;
for (const [nome, quebrar, trecho] of casos) {
  const d = dados('CONVENIO');
  quebrar(d);
  const { erros } = montarPrestacao(d, undefined, HOJE);
  const barrado = erros.some((e) => e.includes(trecho));
  if (!barrado) naoBarrados++;
  console.log(`   ${barrado ? 'barrado ' : 'PASSOU! '} ${nome}`);
}

// E o caso íntegro não pode gerar erro nenhum.
const { erros: errosBase } = montarPrestacao(dados('CONVENIO'), undefined, HOJE);
if (errosBase.length > 0) {
  naoBarrados++;
  console.log(`\n   FALSO POSITIVO: o caso íntegro gerou ${errosBase.length} erro(s):`);
  errosBase.forEach((e) => console.log('      ' + e));
} else {
  console.log('   ok       caso íntegro sem erros');
}

console.log(naoBarrados === 0 ? '\nTudo ok.' : `\n${naoBarrados} caso(s) com problema.`);
process.exit(comProblema === 0 && naoBarrados === 0 ? 0 : 1);

/** Dados normalizados de uma prestação para montagem do documento JSON. Datas em 'YYYY-MM-DD'. */
export interface DadosMontagem {
  ano: number;
  mes: number;
  ehRetificacao: boolean;
  tipoAjuste: string;
  codigoAjuste: string;
  municipio: number | null;
  entidade: number | null;
  /** Valor global do ajuste ± o que os termos aditivos alteraram; teto de descontos e devoluções. */
  valorAtualizadoAjuste: number | null;

  empregados: Array<{
    cpf: string;
    dataAdmissao: string;
    dataDemissao: string | null;
    cbo: string;
    cns: string | null;
    salarioContratual: number;
    periodos: Array<{ mes: number; cargaHoraria: number; remuneracaoBruta: number }>;
  }>;

  bens: Array<{
    categoria: string;
    numeroPatrimonio: string | null;
    descricao: string;
    data: string;
    valor: number | null;
  }>;

  documentosFiscais: Array<{
    numero: string;
    credorTipoDoc: string;
    credorNumeroDoc: string;
    credorNome: string | null;
    descricao: string;
    dataEmissao: string;
    estadoEmissor: number | null;
    valorBruto: number;
    valorEncargos: number;
    categoriaDespesaTipo: number;
    rateioProveniente: boolean;
    rateioPercentual: number | null;
  }>;

  pagamentos: Array<{
    folha: boolean;
    docNumero: string | null;
    docCredorTipo: string | null;
    docCredorNumero: string | null;
    dataPagamento: string;
    valor: number;
    fonteRecursoTipo: number;
    meioPagamento: string;
    banco: number | null;
    agencia: number | null;
    contaCorrente: string | null;
    numeroTransacao: string | null;
  }>;

  receitas: Array<{
    tipo: string;
    descricao: string | null;
    dataPrevista: string | null;
    dataRepasse: string | null;
    fonteRecursoTipo: number | null;
    valor: number;
  }>;

  disponibilidades: Array<{
    banco: number;
    agencia: number;
    conta: string;
    contaTipo: number;
    saldoBancario: number;
    saldoContabil: number;
  }>;
  /** Irmão de `saldos` no bloco Disponibilidades; obrigatório no schema. */
  saldoFundoFixo: number;

  descontos: Array<{ data: string; descricao: string; valor: number }>;
  devolucoes: Array<{ data: string; naturezaDevolucaoTipo: number; valor: number }>;

  glosas: Array<{
    docNumero: string | null;
    docCredorTipo: string | null;
    docCredorNumero: string | null;
    pagamentoData: string | null;
    resultadoAnalise: string;
    valorGlosa: number | null;
  }>;

  empenhos: Array<{
    numero: string;
    dataEmissao: string;
    classificacaoEconomica: string;
    fonteRecursoTipo: number;
    valor: number;
    historico: string | null;
    cpfOrdenadorDespesa: string;
  }>;

  repasses: Array<{
    empenhoNumero: string | null;
    empenhoDataEmissao: string | null;
    dataPrevista: string;
    dataRepasse: string;
    valorPrevisto: number;
    valorRepasse: number;
    justificativaDiferenca: string | null;
    tipoDocumentoBancario: number | null;
    descricaoOutros: string | null;
    numeroDocumento: string | null;
    banco: number | null;
    agencia: number | null;
    conta: string | null;
  }>;

  servidores: Array<{
    cpf: string;
    dataInicialCessao: string;
    dataFinalCessao: string | null;
    cargoPublico: string;
    funcaoEntidade: string;
    onusPagamento: number;
    periodos: Array<{ mes: number; cargaHoraria: number; remuneracaoBruta: number }>;
  }>;

  atividades: Array<{
    nomePrograma: string;
    codigoMeta: string;
    periodo: number;
    quantidadeRealizada: number | null;
    resultadoMeta: string | null;
    justificativaPeriodo: string | null;
    metaAtendida: boolean | null;
    justificativaMeta: string | null;
  }>;

  // Blocos 20/21 — identificadores de certidões (singletons; null se não preenchidos)
  dadosGerais: {
    identCertidaoDadosGerais: string | null;
    identCertidaoCorpoDiretivo: string | null;
    identCertidaoMembrosConselho: string | null;
    identCertidaoResponsaveis: string | null;
  } | null;

  responsaveis: {
    identCertidaoResponsaveis: string | null;
    identCertidaoComissaoAvaliacao: string | null;
    identCertidaoControleInterno: string | null;
    identCertidaoFiscalizacaoExecucao: string | null;
  } | null;

  // Bloco 24 — Declarações
  declaracoesBloco: {
    houveContratacao: boolean | null;
    empresasPertencentes: Array<{ cnpj: string | null; cpf: string | null }>;
    houveParticipacao: boolean | null;
    participacoes: Array<{ cpfDirigente: string | null; cpfsContratados: string[] }>;
    comprasAdequadas: boolean | null;
  } | null;

  // Bloco 33 — Parecer Conclusivo
  parecer: {
    identificacaoParecer: string | null;
    conclusaoParecer: number | null;
    consideracoesParecer: string | null;
    declaracoes: Array<{ tipoDeclaracao: number; declaracao: number | null; justificativa: string | null }>;
  } | null;

  // Bloco 34 — Transparência
  transparencia: {
    mantemSitio: boolean | null;
    sitios: string[];
    requisitos781: Array<{ requisito: number; atende: boolean }>;
    requisitos83: Array<{ requisito: number; atende: boolean }>;
    requisitosDivulgacao: Array<{ requisito: number; atende: boolean }>;
  } | null;

  // Bloco 28 — Demonstrações Contábeis
  demonstracoes: {
    publicacoes: PublicacaoMontagem[];
    respNumeroCrc: string | null;
    respCpf: string | null;
    respSituacaoRegular: boolean | null;
  } | null;

  // Bloco 29 — Publicações de Parecer ou Ata
  publicacaoParecerAta: {
    itens: Array<{
      tipoParecerAta: number;
      houvePublicacao: boolean | null;
      publicacoes: PublicacaoMontagem[];
      conclusaoParecer: number | null;
    }>;
  } | null;

  // Bloco 30 — Publicação do Relatório de Atividades (só Contrato de Gestão)
  publicacaoRelAtividades: {
    houvePublicacaoExercicio: boolean | null;
    publicacoes: PublicacaoMontagem[];
  } | null;

  // Bloco 32 — Prestação de Contas da Entidade Beneficiária
  prestacaoEntidade: {
    dataPrestacao: string | null;
    periodoReferenciaInicial: string | null;
    periodoReferenciaFinal: string | null;
  } | null;

  // Blocos 25/26/27 — Relatório Final (roteado por tipo de ajuste)
  relatorioFinal: {
    houveEmissao: boolean | null;
    conclusao: number | null;
    justificativa: string | null;
  } | null;

  // Bloco 22 — Regulamento de Compras (só CG)
  regulamentoCompras: {
    houvePublicacaoInicial: boolean | null;
    publicacoesInicial: PublicacaoMontagem[];
    houveAlteracao: boolean | null;
    houvePublicacaoAlterado: boolean | null;
    publicacoesAlteracao: PublicacaoMontagem[];
  } | null;

  // Bloco 23 — Extrato Físico-Financeiro (só TP)
  extratoFisicoFinanceiro: {
    haExtrato: boolean | null;
    extratoConformeModelo: boolean | null;
    publicacoes: PublicacaoMontagem[];
  } | null;

  // Bloco 31 — Termo de Bens Cedidos (só CG)
  termoBensCedidos: { termoCessaoPermissao: boolean | null } | null;

  // Bloco 7 — Contratos (lista)
  contratos: Array<{
    numero: string;
    credorTipoDoc: string;
    credorNumeroDoc: string;
    credorNome: string | null;
    dataAssinatura: string;
    vigenciaTipo: string;
    vigenciaDataInicial: string;
    vigenciaDataFinal: string | null;
    objeto: string;
    naturezaContratacao: number[];
    naturezaOutro: string | null;
    criterioSelecao: number | null;
    criterioSelecaoOutro: string | null;
    artigoRegulamentoCompras: string | null;
    valorMontante: number;
    valorTipo: number | null;
  }>;

  // Bloco 12 — Ajustes de Saldo (singleton com 4 arrays)
  ajustesSaldo: {
    retificacaoRepasses: Array<{ dataPrevista: string | null; dataRepasse: string | null; fonteRecursoTipo: number | null; valorRetificado: number | null }>;
    inclusaoRepasses: Array<{ dataPrevista: string | null; dataRepasse: string | null; valor: number | null; fonteRecursoTipo: number | null }>;
    retificacaoPagamentos: Array<{ docNumero: string | null; docCredorTipo: number | null; docCredorNumero: string | null; pagamentoData: string | null; pagamentoValor: number | null; fonteRecursoTipo: number | null; valorRetificado: number | null }>;
    inclusaoPagamentos: Array<{ docNumero: string | null; docCredorTipo: number | null; docCredorNumero: string | null; pagamentoData: string | null; pagamentoValor: number | null; fonteRecursoTipo: number | null; meioPagamento: number | null; banco: number | null; agencia: number | null; contaCorrente: string | null; numeroTransacao: string | null }>;
  } | null;
}

export interface PublicacaoMontagem {
  tipoVeiculo: number | null;
  nomeVeiculo: string | null;
  dataPublicacao: string | null;
  enderecoInternet: string | null;
}

export interface ResultadoMontagem {
  documento: Record<string, unknown>;
  avisos: string[];
  erros: string[]; // regras de negócio que devem ser corrigidas ANTES de transmitir
}

/**
 * Códigos usados na prestação que não constam das tabelas de domínio oficiais.
 * Levantado pelo repositório (que tem acesso às tabelas) e repassado à
 * validação, que segue sendo uma função pura.
 */
export interface CodigosInexistentes {
  cbos: string[];
  classificacoes: Array<{ codigo: string; exercicio: number }>;
}

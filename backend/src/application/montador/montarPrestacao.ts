import type { CodigosInexistentes, DadosMontagem, ResultadoMontagem } from './tipos';
import { validarPrestacao } from './validarPrestacao';
import { validarDominios } from './validarDominios';

const TIPO_DOCUMENTO: Record<string, string> = {
  CONTRATO_GESTAO: 'Prestação de Contas de Contrato de Gestão',
  CONVENIO: 'Prestação de Contas de Convênio',
  TERMO_COLABORACAO: 'Prestação de Contas de Termo de Colaboração',
  TERMO_FOMENTO: 'Prestação de Contas de Termo de Fomento',
  TERMO_PARCERIA: 'Prestação de Contas de Termo de Parceria',
};

const DOC_TIPO: Record<string, number> = { CPF: 1, CNPJ: 2, RNE: 3 };
const MEIO: Record<string, number> = { BANCO: 1, FUNDO_FIXO: 2 };
const RESULTADO_ANALISE: Record<string, number> = { APROVADO: 1, APROVADO_PARCIALMENTE: 2, REPROVADO: 3 };
const RESULTADO_META: Record<string, number> = { CUMPRIDA: 1, NAO_CUMPRIDA: 2, CUMPRIDA_PARCIALMENTE: 3 };

const SEM_TIPO: Record<string, unknown[]> = {}; // placeholder p/ blocos ainda não capturados

/** Remove chaves com valor null/undefined (mantém o JSON enxuto). */
function limpo<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined) out[k] = v;
  return out as T;
}

/**
 * Monta o documento JSON da prestação (versão 1.14 do schema) a partir dos
 * blocos capturados. Retorna também `avisos` com as lacunas conhecidas.
 * É uma PRÉVIA: alguns blocos declaratórios/certidões ainda não são capturados.
 */
export function montarPrestacao(d: DadosMontagem, inexistentes?: CodigosInexistentes): ResultadoMontagem {
  const avisos: string[] = [];
  const doc: Record<string, unknown> = {};

  // --- Descritor + código do ajuste ---
  doc.descritor = limpo({
    tipo_documento: TIPO_DOCUMENTO[d.tipoAjuste] ?? d.tipoAjuste,
    municipio: d.municipio,
    entidade: d.entidade,
    ano: d.ano,
    mes: d.mes,
  });
  doc.codigo_ajuste = d.codigoAjuste;
  if (d.ehRetificacao) doc.retificacao = true;
  if (d.municipio == null || d.entidade == null)
    avisos.push('Descritor: código de município/entidade do órgão não informado (vem do cadastro do Cliente/órgão).');

  // --- Relação de Empregados ---
  doc.relacao_empregados = d.empregados.map((e) =>
    limpo({
      cpf: e.cpf,
      data_admissao: e.dataAdmissao,
      data_demissao: e.dataDemissao,
      cbo: e.cbo,
      cns: e.cns,
      salario_contratual: e.salarioContratual,
      periodos_remuneracao: e.periodos.map((p) => ({
        mes: p.mes,
        carga_horaria: p.cargaHoraria,
        remuneracao_bruta: p.remuneracaoBruta,
      })),
    }),
  );

  // --- Relação de Bens (6 categorias) ---
  const bens = (cat: string) => d.bens.filter((b) => b.categoria === cat);
  doc.relacao_bens = {
    relacao_bens_moveis_adquiridos: bens('MOVEL_ADQUIRIDO').map((b) => ({
      numero_patrimonio: b.numeroPatrimonio,
      descricao: b.descricao,
      data_aquisicao: b.data,
      valor_aquisicao: b.valor,
    })),
    relacao_bens_moveis_cedidos: bens('MOVEL_CEDIDO').map((b) => ({
      numero_patrimonio: b.numeroPatrimonio,
      descricao: b.descricao,
      data_cessao: b.data,
      valor_cessao: b.valor,
    })),
    relacao_bens_moveis_baixados_devolvidos: bens('MOVEL_BAIXADO').map((b) => ({
      numero_patrimonio: b.numeroPatrimonio,
      data_baixa_devolucao: b.data,
    })),
    relacao_bens_imoveis_adquiridos: bens('IMOVEL_ADQUIRIDO').map((b) => ({ descricao: b.descricao, data_aquisicao: b.data })),
    relacao_bens_imoveis_cedidos: bens('IMOVEL_CEDIDO').map((b) => ({ descricao: b.descricao, data_cessao: b.data })),
    relacao_bens_imoveis_baixados_devolvidos: bens('IMOVEL_BAIXADO').map((b) => ({ descricao: b.descricao, data_baixa_devolucao: b.data })),
  };

  // --- Documentos Fiscais ---
  doc.documentos_fiscais = d.documentosFiscais.map((f) =>
    limpo({
      numero: f.numero,
      credor: limpo({ documento_tipo: DOC_TIPO[f.credorTipoDoc], documento_numero: f.credorNumeroDoc, nome: f.credorNome }),
      // Só sai quando a nota aponta para um contrato: o schema exige os três
      // campos juntos (maxProperties 3), então metade do objeto seria recusada.
      identificacao_contrato: f.contrato
        ? {
            numero: f.contrato.numero,
            data_assinatura: f.contrato.dataAssinatura,
            identificacao_credor: {
              documento_tipo: DOC_TIPO[f.contrato.credorTipoDoc],
              documento_numero: f.contrato.credorNumeroDoc,
            },
          }
        : null,
      descricao: f.descricao,
      data_emissao: f.dataEmissao,
      estado_emissor: f.estadoEmissor,
      valor_bruto: f.valorBruto,
      valor_encargos: f.valorEncargos,
      categoria_despesas_tipo: f.categoriaDespesaTipo,
      rateio_proveniente_tipo: f.rateioProveniente ? 1 : 2,
      rateio_percentual: f.rateioProveniente ? f.rateioPercentual : null,
    }),
  );

  // --- Pagamentos ---
  doc.pagamentos = d.pagamentos.map((p) =>
    limpo({
      identificacao_documento_fiscal: limpo({
        numero: p.folha ? '9999' : p.docNumero,
        identificacao_credor:
          !p.folha && p.docCredorTipo && p.docCredorNumero
            ? { documento_tipo: DOC_TIPO[p.docCredorTipo], documento_numero: p.docCredorNumero }
            : null,
      }),
      pagamento_data: p.dataPagamento,
      pagamento_valor: p.valor,
      fonte_recurso_tipo: p.fonteRecursoTipo,
      meio_pagamento_tipo: MEIO[p.meioPagamento],
      banco: p.meioPagamento === 'BANCO' ? p.banco : null,
      agencia: p.meioPagamento === 'BANCO' ? p.agencia : null,
      conta_corrente: p.meioPagamento === 'BANCO' ? p.contaCorrente : null,
      numero_transacao: p.numeroTransacao,
    }),
  );

  // --- Receitas (objeto) ---
  const somaAplic = (tipo: string) =>
    d.receitas.filter((r) => r.tipo === tipo).reduce((s, r) => s + r.valor, 0);
  // Legado: registros antigos sem esfera caem em "municipais" (compatibilidade).
  const aplicLegado = somaAplic('APLIC_FINANCEIRA');
  if (aplicLegado !== 0)
    avisos.push('Receitas: há aplicações financeiras sem esfera (registro antigo) somadas em "…_municipais". Reclassifique como municipal/estadual/federal.');
  doc.receitas = {
    receitas_aplic_financ_repasses_publicos_municipais: somaAplic('APLIC_FINANC_MUNICIPAL') + aplicLegado,
    receitas_aplic_financ_repasses_publicos_estaduais: somaAplic('APLIC_FINANC_ESTADUAL'),
    receitas_aplic_financ_repasses_publicos_federais: somaAplic('APLIC_FINANC_FEDERAL'),
    repasses_recebidos: d.receitas
      .filter((r) => r.tipo === 'REPASSE_RECEBIDO')
      .map((r) => limpo({ data_prevista: r.dataPrevista, data_repasse: r.dataRepasse, valor: r.valor, fonte_recurso_tipo: r.fonteRecursoTipo })),
    outras_receitas: d.receitas.filter((r) => r.tipo === 'OUTRA').map((r) => ({ descricao: r.descricao ?? '', valor: r.valor })),
    recursos_proprios: d.receitas.filter((r) => r.tipo === 'RECURSO_PROPRIO').map((r) => ({ descricao: r.descricao ?? '', valor: r.valor })),
  };

  // --- Disponibilidades ---
  doc.disponibilidades = {
    saldos: d.disponibilidades.map((x) => ({
      banco: x.banco,
      agencia: x.agencia,
      conta: x.conta,
      conta_tipo: x.contaTipo,
      saldo_bancario: x.saldoBancario,
      saldo_contabil: x.saldoContabil,
    })),
    saldo_fundo_fixo: d.saldoFundoFixo,
  };

  // --- Descontos / Devoluções ---
  doc.descontos = d.descontos.map((x) => ({ data: x.data, descricao: x.descricao, valor: x.valor }));
  doc.devolucoes = d.devolucoes.map((x) => ({ data: x.data, natureza_devolucao_tipo: x.naturezaDevolucaoTipo, valor: x.valor }));

  // --- Glosas ---
  doc.glosas = d.glosas.map((g) =>
    limpo({
      identificacao_documento_fiscal:
        g.docNumero && g.docCredorTipo && g.docCredorNumero
          ? { numero: g.docNumero, identificacao_credor: { documento_tipo: DOC_TIPO[g.docCredorTipo], documento_numero: g.docCredorNumero } }
          : null,
      pagamento_data: g.pagamentoData,
      resultado_analise: RESULTADO_ANALISE[g.resultadoAnalise],
      valor_glosa: g.resultadoAnalise === 'APROVADO_PARCIALMENTE' ? g.valorGlosa : null,
    }),
  );

  // --- Empenhos ---
  doc.empenhos = d.empenhos.map((e) =>
    limpo({
      numero: e.numero,
      data_emissao: e.dataEmissao,
      classificacao_economica_tipo: e.classificacaoEconomica,
      fonte_recurso_tipo: e.fonteRecursoTipo,
      valor: e.valor,
      historico: e.historico,
      cpf_ordenador_despesa: e.cpfOrdenadorDespesa,
    }),
  );

  // --- Repasses ---
  doc.repasses = d.repasses.map((r) =>
    limpo({
      identificacao_empenho: r.empenhoNumero && r.empenhoDataEmissao ? { numero: r.empenhoNumero, data_emissao: r.empenhoDataEmissao } : null,
      data_prevista: r.dataPrevista,
      data_repasse: r.dataRepasse,
      valor_previsto: r.valorPrevisto,
      valor_repasse: r.valorRepasse,
      justificativa_diferenca_valor: r.justificativaDiferenca,
      tipo_documento_bancario: r.tipoDocumentoBancario,
      descricao_outros: r.descricaoOutros,
      numero_documento: r.numeroDocumento,
      banco: r.banco,
      agencia: r.agencia,
      conta: r.conta,
    }),
  );

  // --- Servidores Cedidos (não p/ Colaboração/Fomento) ---
  if (d.tipoAjuste !== 'TERMO_COLABORACAO' && d.tipoAjuste !== 'TERMO_FOMENTO') {
    doc.servidores_cedidos = d.servidores.map((s) =>
      limpo({
        cpf: s.cpf,
        data_inicial_cessao: s.dataInicialCessao,
        data_final_cessao: s.dataFinalCessao,
        cargo_publico_ocupado: s.cargoPublico,
        funcao_desempenhada_entidade_beneficiaria: s.funcaoEntidade,
        onus_pagamento: s.onusPagamento,
        periodos_cessao: s.periodos.map((p) => ({ mes: p.mes, carga_horaria: p.cargaHoraria, remuneracao_bruta: p.remuneracaoBruta })),
      }),
    );
  }

  // --- Relatório de Atividades (programas → metas → periodicidades) ---
  const porPrograma = new Map<string, Map<string, typeof d.atividades>>();
  for (const a of d.atividades) {
    if (!porPrograma.has(a.nomePrograma)) porPrograma.set(a.nomePrograma, new Map());
    const metas = porPrograma.get(a.nomePrograma)!;
    if (!metas.has(a.codigoMeta)) metas.set(a.codigoMeta, []);
    metas.get(a.codigoMeta)!.push(a);
  }
  doc.relatorio_atividades = {
    programas: [...porPrograma.entries()].map(([nome_programa, metas]) => ({
      nome_programa,
      metas: [...metas.entries()].map(([codigo_meta, linhas]) => {
        const ref = linhas[0];
        return limpo({
          codigo_meta,
          periodicidades: linhas.map((l) =>
            limpo({
              periodo: l.periodo,
              quantidade_realizada: l.quantidadeRealizada,
              resultado_meta: l.resultadoMeta ? RESULTADO_META[l.resultadoMeta] : null,
              justificativa: l.justificativaPeriodo,
            }),
          ),
          meta_atendida: ref.metaAtendida,
          justificativa: ref.metaAtendida === false ? ref.justificativaMeta : null,
        });
      }),
    })),
  };

  // --- Dados Gerais da Entidade Beneficiária (bloco 20) ---
  // identificacao_certidao_responsaveis (entidade gerenciada) só p/ Contrato de Gestão.
  if (d.dadosGerais) {
    const dg = limpo({
      identificacao_certidao_dados_gerais: d.dadosGerais.identCertidaoDadosGerais,
      identificacao_certidao_corpo_diretivo: d.dadosGerais.identCertidaoCorpoDiretivo,
      identificacao_certidao_membros_conselho: d.dadosGerais.identCertidaoMembrosConselho,
      identificacao_certidao_responsaveis:
        d.tipoAjuste === 'CONTRATO_GESTAO' ? d.dadosGerais.identCertidaoResponsaveis : null,
    });
    if (Object.keys(dg).length) doc.dados_gerais_entidade_beneficiaria = dg;
  }

  // --- Responsáveis e Membros do Órgão Concessor (bloco 21) ---
  // fiscalizacao_execucao só p/ Convênio, Termo de Colaboração e Fomento.
  if (d.responsaveis) {
    const fiscalizavel =
      d.tipoAjuste === 'CONVENIO' || d.tipoAjuste === 'TERMO_COLABORACAO' || d.tipoAjuste === 'TERMO_FOMENTO';
    const rc = limpo({
      identificacao_certidao_responsaveis: d.responsaveis.identCertidaoResponsaveis,
      identificacao_certidao_membros_comissao_avaliacao: d.responsaveis.identCertidaoComissaoAvaliacao,
      identificacao_certidao_membros_controle_interno: d.responsaveis.identCertidaoControleInterno,
      identificacao_certidao_responsaveis_fiscalizacao_execucao: fiscalizavel
        ? d.responsaveis.identCertidaoFiscalizacaoExecucao
        : null,
    });
    if (Object.keys(rc).length) doc.responsaveis_membros_orgao_concessor = rc;
  }

  // --- Declarações (bloco 24) ---
  // compras_contratacoes_adequados_regulamento_proprio só p/ Contrato de Gestão e Termo de Parceria.
  if (d.declaracoesBloco) {
    const dc = d.declaracoesBloco;
    const cgOuTp = d.tipoAjuste === 'CONTRATO_GESTAO' || d.tipoAjuste === 'TERMO_PARCERIA';
    doc.declaracoes = limpo({
      houve_contratacao_empresas_pertencentes: dc.houveContratacao,
      // O schema exige os DOIS campos em cada item (CNPJ da empresa contratada
      // + CPF do dirigente/agente político): não use `limpo` aqui.
      empresas_pertencentes: dc.houveContratacao
        ? dc.empresasPertencentes.map((e) => ({ cnpj: e.cnpj ?? '', cpf: e.cpf ?? '' }))
        : null,
      houve_participacao_quadro_diretivo_administrativo: dc.houveParticipacao,
      participacoes_quadro_diretivo_administrativo: dc.houveParticipacao
        ? dc.participacoes.map((p) => limpo({ cpf_dirigente: p.cpfDirigente, cpf_contratados: p.cpfsContratados }))
        : null,
      compras_contratacoes_adequados_regulamento_proprio: cgOuTp ? dc.comprasAdequadas : null,
    });
  }

  // --- Parecer Conclusivo (bloco 33) ---
  if (d.parecer) {
    doc.parecer_conclusivo = limpo({
      identificacao_parecer: d.parecer.identificacaoParecer,
      conclusao_parecer: d.parecer.conclusaoParecer,
      consideracoes_parecer: d.parecer.consideracoesParecer,
      declaracoes: d.parecer.declaracoes.map((dec) =>
        limpo({ tipo_declaracao: dec.tipoDeclaracao, declaracao: dec.declaracao, justificativa: dec.justificativa }),
      ),
    });
  }

  // --- Transparência (bloco 34) ---
  if (d.transparencia) {
    const t = d.transparencia;
    const reqs = (lista: Array<{ requisito: number; atende: boolean }>) =>
      lista.map((r) => ({ requisito: r.requisito, atende: r.atende }));
    doc.transparencia = limpo({
      entidade_beneficiaria_mantem_sitio_internet: t.mantemSitio,
      sitios_internet: t.mantemSitio ? t.sitios : null,
      requisitos_artigos_7o_8o_paragrafo_1o: t.mantemSitio ? reqs(t.requisitos781) : null,
      requisitos_sitio_artigo_8o_paragrafo_3o: t.mantemSitio ? reqs(t.requisitos83) : null,
      requisitos_divulgacao_informacoes: t.mantemSitio ? reqs(t.requisitosDivulgacao) : null,
    });
  }

  // Publicação (subestrutura reutilizada nos blocos 28/29/30).
  const pub = (p: { tipoVeiculo: number | null; nomeVeiculo: string | null; dataPublicacao: string | null; enderecoInternet: string | null }) =>
    limpo({
      tipo_veiculo_publicacao: p.tipoVeiculo,
      nome_veiculo: p.tipoVeiculo === 10 ? p.nomeVeiculo : null,
      data_publicacao: p.dataPublicacao,
      endereco_internet: p.enderecoInternet,
    });

  // --- Demonstrações Contábeis (bloco 28) ---
  if (d.demonstracoes) {
    const dm = d.demonstracoes;
    doc.demonstracoes_contabeis = limpo({
      publicacoes: dm.publicacoes.map(pub),
      responsavel: limpo({
        numero_crc: dm.respNumeroCrc,
        cpf: dm.respCpf,
        situacao_regular_crc: dm.respSituacaoRegular,
      }),
    });
  }

  // --- Publicações de Parecer ou Ata (bloco 29) ---
  if (d.publicacaoParecerAta && d.publicacaoParecerAta.itens.length) {
    doc.publicacoes_parecer_ata = d.publicacaoParecerAta.itens.map((it) =>
      limpo({
        tipo_parecer_ata: it.tipoParecerAta,
        houve_publicacao: it.houvePublicacao,
        publicacoes: it.houvePublicacao ? it.publicacoes.map(pub) : null,
        conclusao_parecer: it.conclusaoParecer,
      }),
    );
  }

  // --- Publicação do Relatório de Atividades (bloco 30; só Contrato de Gestão) ---
  if (d.publicacaoRelAtividades && d.tipoAjuste === 'CONTRATO_GESTAO') {
    const pr = d.publicacaoRelAtividades;
    doc.publicacao_relatorio_atividades = limpo({
      houve_publicacao_exercicio: pr.houvePublicacaoExercicio,
      publicacoes: pr.houvePublicacaoExercicio ? pr.publicacoes.map(pub) : null,
    });
  }

  // --- Prestação de Contas da Entidade Beneficiária (bloco 32) ---
  if (d.prestacaoEntidade) {
    const pe = d.prestacaoEntidade;
    const bloco = limpo({
      data_prestacao: pe.dataPrestacao,
      periodo_referencia_data_inicial: pe.periodoReferenciaInicial,
      periodo_referencia_data_final: pe.periodoReferenciaFinal,
    });
    if (Object.keys(bloco).length) doc.prestacao_contas_entidade_beneficiaria = bloco;
  }

  // --- Relatório Final da fiscalização (blocos 25/26/27; chave por tipo de ajuste) ---
  if (d.relatorioFinal) {
    const CHAVE_RELATORIO: Record<string, string> = {
      CONTRATO_GESTAO: 'relatorio_comissao_avaliacao',
      CONVENIO: 'relatorio_governamental_analise_execucao',
      TERMO_COLABORACAO: 'relatorio_monitoramento_avaliacao',
      TERMO_FOMENTO: 'relatorio_monitoramento_avaliacao',
    };
    const chave = CHAVE_RELATORIO[d.tipoAjuste];
    if (chave) {
      const rf = d.relatorioFinal;
      doc[chave] = limpo({
        houve_emissao_relatorio_final: rf.houveEmissao,
        conclusao_relatorio: rf.houveEmissao ? rf.conclusao : null,
        justificativa: rf.conclusao === 3 ? rf.justificativa : null,
      });
    }
  }

  // --- Regulamento de Compras (bloco 22; só Contrato de Gestão) ---
  if (d.regulamentoCompras && d.tipoAjuste === 'CONTRATO_GESTAO') {
    const rg = d.regulamentoCompras;
    doc.publicacao_regulamento_compras = limpo({
      houve_publicacao_inicial: rg.houvePublicacaoInicial,
      publicacoes_regulamento_inicial: rg.houvePublicacaoInicial ? rg.publicacoesInicial.map(pub) : null,
      houve_alteracao_do_regulamento: rg.houveAlteracao,
      houve_publicacao_regulamento_alterado: rg.houvePublicacaoAlterado,
      publicacoes_alteracao_regulamento: rg.houvePublicacaoAlterado ? rg.publicacoesAlteracao.map(pub) : null,
    });
  }

  // --- Extrato de Execução Física e Financeira (bloco 23; só Termo de Parceria) ---
  if (d.extratoFisicoFinanceiro && d.tipoAjuste === 'TERMO_PARCERIA') {
    const ex = d.extratoFisicoFinanceiro;
    doc.publicacao_extrato_execucao_fisica_financeira = limpo({
      ha_extrato_execucao_fisica_financeira: ex.haExtrato,
      extrato_elaborado_conforme_modelo: ex.haExtrato ? ex.extratoConformeModelo : null,
      publicacoes: ex.haExtrato ? ex.publicacoes.map(pub) : null,
    });
  }

  // --- Termo da Relação de Bens Cedidos (bloco 31; só Contrato de Gestão) ---
  if (d.termoBensCedidos && d.tipoAjuste === 'CONTRATO_GESTAO' && d.termoBensCedidos.termoCessaoPermissao != null) {
    doc.termo_cessao_permissao_bens = d.termoBensCedidos.termoCessaoPermissao;
  }

  // --- Contratos (bloco 7) ---
  const VIGENCIA: Record<string, number> = { PRE_ESTABELECIDA: 1, INDETERMINADA: 2 };
  doc.contratos = d.contratos.map((c) =>
    limpo({
      numero: c.numero,
      credor: limpo({ documento_tipo: DOC_TIPO[c.credorTipoDoc], documento_numero: c.credorNumeroDoc, nome: c.credorNome }),
      data_assinatura: c.dataAssinatura,
      vigencia_tipo: VIGENCIA[c.vigenciaTipo],
      vigencia_data_inicial: c.vigenciaDataInicial,
      vigencia_data_final: c.vigenciaDataFinal,
      objeto: c.objeto,
      natureza_contratacao: c.naturezaContratacao,
      natureza_contratacao_outro: c.naturezaContratacao.includes(23) ? c.naturezaOutro : null,
      criterio_selecao: c.criterioSelecao,
      criterio_selecao_outro: c.criterioSelecao === 4 ? c.criterioSelecaoOutro : null,
      artigo_regulamento_compras: c.artigoRegulamentoCompras,
      valor_montante: c.valorMontante,
      valor_tipo: c.valorTipo,
    }),
  );

  // --- Ajustes de Saldo (bloco 12) ---
  if (d.ajustesSaldo) {
    const a = d.ajustesSaldo;
    const identDoc = (numero: string | null, tipo: number | null, num: string | null) =>
      numero || tipo != null || num
        ? limpo({
            numero,
            identificacao_credor: tipo != null || num ? limpo({ documento_tipo: tipo, documento_numero: num }) : null,
          })
        : null;
    const naoVazio = <T>(l: T[]) => (l.length ? l : null);
    const bloco = limpo({
      retificacao_repasses: naoVazio(
        a.retificacaoRepasses.map((r) =>
          limpo({ data_prevista: r.dataPrevista, data_repasse: r.dataRepasse, fonte_recurso_tipo: r.fonteRecursoTipo, valor_retificado: r.valorRetificado }),
        ),
      ),
      inclusao_repasses: naoVazio(
        a.inclusaoRepasses.map((r) => limpo({ data_prevista: r.dataPrevista, data_repasse: r.dataRepasse, valor: r.valor, fonte_recurso_tipo: r.fonteRecursoTipo })),
      ),
      retificacao_pagamentos: naoVazio(
        a.retificacaoPagamentos.map((p) =>
          limpo({
            identificacao_documento_fiscal: identDoc(p.docNumero, p.docCredorTipo, p.docCredorNumero),
            pagamento_data: p.pagamentoData,
            pagamento_valor: p.pagamentoValor,
            fonte_recurso_tipo: p.fonteRecursoTipo,
            valor_retificado: p.valorRetificado,
          }),
        ),
      ),
      inclusao_pagamentos: naoVazio(
        a.inclusaoPagamentos.map((p) =>
          limpo({
            identificacao_documento_fiscal: identDoc(p.docNumero, p.docCredorTipo, p.docCredorNumero),
            pagamento_data: p.pagamentoData,
            pagamento_valor: p.pagamentoValor,
            fonte_recurso_tipo: p.fonteRecursoTipo,
            meio_pagamento_tipo: p.meioPagamento,
            banco: p.meioPagamento === 1 ? p.banco : null,
            agencia: p.meioPagamento === 1 ? p.agencia : null,
            conta_corrente: p.meioPagamento === 1 ? p.contaCorrente : null,
            numero_transacao: p.numeroTransacao,
          }),
        ),
      ),
    });
    if (Object.keys(bloco).length) doc.ajustes_saldo = bloco;
  }

  void SEM_TIPO;
  // Todos os códigos de domínio agora vêm de tabelas oficiais (schema v1.14 e
  // as tabelas CBO/classificação econômica carregadas), então código inválido
  // é erro bloqueante — seria rejeitado na transmissão de qualquer forma.
  return {
    documento: doc,
    avisos,
    erros: [...validarPrestacao(d, inexistentes), ...validarDominios(d)],
  };
}

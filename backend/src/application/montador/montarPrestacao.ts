import type { DadosMontagem, ResultadoMontagem } from './tipos';

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
export function montarPrestacao(d: DadosMontagem): ResultadoMontagem {
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

  avisos.push(
    'Prévia parcial: blocos ainda não capturados neste sistema — Contratos, Ajustes de Saldo, Dados Gerais/Certidões, Responsáveis, Publicações, Declarações, Parecer Conclusivo, Transparência e Demonstrações Contábeis.',
  );

  void SEM_TIPO;
  return { documento: doc, avisos };
}

import {
  CRITERIO_SELECAO_OUTROS,
  NATUREZA_CONTRATACAO_OUTROS,
  TIPO_DOCUMENTO_BANCARIO_OUTROS,
} from '@/core/dominio/tabelasFaseV';
import type { CodigosInexistentes, DadosMontagem } from './tipos';

/** Data em 'YYYY-MM-DD' (UTC), o mesmo formato usado em todo o documento. */
function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Espelha as regras de negócio do manual v1.19 que devem ser corrigidas ANTES
 * de transmitir (falhar cedo — §12: ~75% das remessas do 1º ano foram
 * rejeitadas por falta de teste). Retorna a lista de erros bloqueantes.
 * Complementa as validações por bloco (feitas na captura de cada item).
 *
 * `inexistentes` traz os códigos já confrontados com as tabelas de domínio
 * oficiais (a consulta é feita pelo repositório, para esta função continuar
 * pura). Quando omitido, essa checagem simplesmente não é feita.
 *
 * `hoje` é injetável para a função permanecer determinística — várias regras
 * do manual comparam datas com "a data corrente".
 */
export function validarPrestacao(
  d: DadosMontagem,
  inexistentes?: CodigosInexistentes,
  hoje: Date = new Date(),
): string[] {
  const erros: string[] = [];

  const hojeISO = paraISO(hoje);
  /** A prestação é anual (mes = 12), então o período do documento é o ano. */
  const noPeriodo = (data: string | null): boolean => !data || data.slice(0, 4) === String(d.ano);
  const anosDepois = (data: string, anos: number): string =>
    `${String(Number(data.slice(0, 4)) + anos).padStart(4, '0')}${data.slice(4)}`;

  // --- Códigos que não existem nas tabelas oficiais ---
  for (const cbo of inexistentes?.cbos ?? [])
    erros.push(`CBO ${cbo}: código não consta na tabela oficial de ocupações (CBO 2002).`);
  for (const c of inexistentes?.classificacoes ?? [])
    erros.push(
      `Classificação econômica ${c.codigo}: código não consta na tabela oficial do exercício ${c.exercicio}.`,
    );
  const chaveDoc = (numero: string | null, tipo: string | null, num: string | null) => `${numero}|${tipo}|${num}`;

  // --- Descritor ---
  if (d.municipio == null || d.entidade == null)
    erros.push('Descritor: vincule o órgão prestador ao ajuste (código de município/entidade).');
  if (!d.codigoAjuste?.trim()) erros.push('Descritor: código do ajuste ausente.');
  if (d.ano < 2025) erros.push('Descritor: o ano do exercício deve ser 2025 ou posterior.');

  // --- Empregados: CNS obrigatório p/ profissional de saúde (CBO 225x) ---
  for (const e of d.empregados) {
    if (e.cbo?.startsWith('225') && !e.cns)
      erros.push(`Empregado CPF ${e.cpf}: CNS é obrigatório para profissionais de saúde (CBO ${e.cbo}).`);
  }

  // --- Descontos e devoluções: > 0 e < valor atualizado do ajuste ---
  const teto = d.valorAtualizadoAjuste;
  for (const x of d.descontos) {
    if (x.valor <= 0) erros.push(`Desconto de ${x.data}: o valor deve ser maior que zero.`);
    else if (teto != null && x.valor >= teto)
      erros.push(
        `Desconto de ${x.data}: o valor deve ser menor que o valor atualizado do ajuste (${teto.toFixed(2)}).`,
      );
  }
  for (const x of d.devolucoes) {
    if (x.valor <= 0) erros.push(`Devolução de ${x.data}: o valor deve ser maior que zero.`);
    else if (teto != null && x.valor >= teto)
      erros.push(
        `Devolução de ${x.data}: o valor deve ser menor que o valor atualizado do ajuste (${teto.toFixed(2)}).`,
      );
  }

  // --- Documentos fiscais: encargos < bruto; rateio; emissão não futura ---
  for (const f of d.documentosFiscais) {
    if (f.valorEncargos >= f.valorBruto)
      erros.push(`Documento fiscal ${f.numero}: o valor dos encargos deve ser menor que o valor bruto.`);
    if (f.rateioProveniente && f.rateioPercentual == null)
      erros.push(`Documento fiscal ${f.numero}: informe o percentual de rateio (proveniente de rateio).`);
    if (f.dataEmissao > hojeISO)
      erros.push(`Documento fiscal ${f.numero}: a data de emissão não pode ser futura.`);
  }

  // --- Pagamentos, descontos, devoluções e repasses recebidos: no período ---
  for (const p of d.pagamentos) {
    if (p.dataPagamento > hojeISO) erros.push(`Pagamento de ${p.dataPagamento}: a data não pode ser futura.`);
    if (!noPeriodo(p.dataPagamento))
      erros.push(`Pagamento de ${p.dataPagamento}: a data deve estar dentro do exercício ${d.ano}.`);
  }
  for (const x of d.descontos) {
    if (!noPeriodo(x.data)) erros.push(`Desconto de ${x.data}: a data deve estar dentro do exercício ${d.ano}.`);
  }
  for (const x of d.devolucoes) {
    if (!noPeriodo(x.data)) erros.push(`Devolução de ${x.data}: a data deve estar dentro do exercício ${d.ano}.`);
  }
  for (const r of d.receitas) {
    if (r.tipo === 'REPASSE_RECEBIDO' && !noPeriodo(r.dataRepasse))
      erros.push(`Receitas: o repasse de ${r.dataRepasse} deve estar dentro do exercício ${d.ano}.`);
  }

  // --- Empenhos: emissão não futura ---
  for (const e of d.empenhos) {
    if (e.dataEmissao > hojeISO) erros.push(`Empenho ${e.numero}: a data de emissão não pode ser futura.`);
  }

  // --- Glosas: todo documento fiscal informado precisa de análise ---
  const analisados = new Set(d.glosas.filter((g) => !g.pagamentoData).map((g) => chaveDoc(g.docNumero, g.docCredorTipo, g.docCredorNumero)));
  for (const f of d.documentosFiscais) {
    if (!analisados.has(chaveDoc(f.numero, f.credorTipoDoc, f.credorNumeroDoc)))
      erros.push(`Glosas: falta a análise do documento fiscal ${f.numero} (todo documento fiscal deve ser analisado).`);
  }
  // Valor da glosa parcial: > 0 e < valor bruto do documento analisado (§16 #3).
  const brutoPorDoc = new Map(
    d.documentosFiscais.map((f) => [chaveDoc(f.numero, f.credorTipoDoc, f.credorNumeroDoc), f.valorBruto]),
  );
  for (const g of d.glosas) {
    if (g.resultadoAnalise !== 'APROVADO_PARCIALMENTE') continue;
    if (g.valorGlosa == null) {
      erros.push('Glosas: informe o valor da glosa quando o resultado for "Aprovado parcialmente".');
      continue;
    }
    if (g.valorGlosa <= 0) erros.push(`Glosas (doc. ${g.docNumero}): o valor da glosa deve ser maior que zero.`);
    const bruto = brutoPorDoc.get(chaveDoc(g.docNumero, g.docCredorTipo, g.docCredorNumero));
    if (bruto != null && g.valorGlosa >= bruto)
      erros.push(
        `Glosas (doc. ${g.docNumero}): o valor da glosa deve ser menor que o valor bruto do documento (${bruto.toFixed(2)}).`,
      );
  }

  // --- Repasses: justificativa, documento bancário e limites do empenho ---
  const empenhoPorNumero = new Map(d.empenhos.map((e) => [e.numero, e]));
  const repassadoPorEmpenho = new Map<string, number>();
  for (const r of d.repasses) {
    if (r.valorPrevisto !== r.valorRepasse && !r.justificativaDiferenca)
      erros.push('Repasses: informe a justificativa quando o valor do repasse difere do previsto.');
    if (r.tipoDocumentoBancario === TIPO_DOCUMENTO_BANCARIO_OUTROS && !r.descricaoOutros)
      erros.push('Repasses: descreva o documento bancário quando o tipo for "Outros".');
    if (r.dataRepasse > hojeISO) erros.push(`Repasse de ${r.dataRepasse}: a data não pode ser futura.`);

    const empenho = r.empenhoNumero ? empenhoPorNumero.get(r.empenhoNumero) : undefined;
    if (!empenho) continue;
    if (r.dataRepasse < empenho.dataEmissao)
      erros.push(
        `Repasse de ${r.dataRepasse}: a data não pode ser anterior à emissão do empenho ${empenho.numero} (${empenho.dataEmissao}).`,
      );
    if (r.valorPrevisto > empenho.valor)
      erros.push(
        `Repasse do empenho ${empenho.numero}: o valor previsto (${r.valorPrevisto.toFixed(2)}) não pode superar o valor do empenho (${empenho.valor.toFixed(2)}).`,
      );
    repassadoPorEmpenho.set(empenho.numero, (repassadoPorEmpenho.get(empenho.numero) ?? 0) + r.valorRepasse);
  }
  for (const [numero, somado] of repassadoPorEmpenho) {
    const empenho = empenhoPorNumero.get(numero);
    if (empenho && somado > empenho.valor)
      erros.push(
        `Empenho ${numero}: a soma dos repasses (${somado.toFixed(2)}) supera o valor do empenho (${empenho.valor.toFixed(2)}).`,
      );
  }

  // --- Relatório de atividades: justificativa quando meta não atendida ---
  for (const a of d.atividades) {
    if (a.metaAtendida === false && !a.justificativaMeta)
      erros.push(`Relatório de atividades (meta ${a.codigoMeta}): justificativa obrigatória quando a meta não foi atendida.`);
  }

  // --- Contratos: artigo do regulamento obrigatório p/ CG e TP; condicionais ---
  const exigeArtigo = d.tipoAjuste === 'CONTRATO_GESTAO' || d.tipoAjuste === 'TERMO_PARCERIA';
  for (const c of d.contratos) {
    if (exigeArtigo && !c.artigoRegulamentoCompras)
      erros.push(`Contrato ${c.numero}: artigo do regulamento de compras é obrigatório para este tipo de ajuste.`);
    if (c.credorTipoDoc === 'RNE' && !c.credorNome)
      erros.push(`Contrato ${c.numero}: informe o nome do credor (documento RNE).`);
    if (c.vigenciaTipo === 'PRE_ESTABELECIDA' && !c.vigenciaDataFinal)
      erros.push(`Contrato ${c.numero}: informe a data final da vigência (pré-estabelecida).`);
    if (c.naturezaContratacao.includes(NATUREZA_CONTRATACAO_OUTROS) && !c.naturezaOutro)
      erros.push(`Contrato ${c.numero}: descreva os "Outros Serviços" (natureza ${NATUREZA_CONTRATACAO_OUTROS}).`);
    if (c.criterioSelecao === CRITERIO_SELECAO_OUTROS && !c.criterioSelecaoOutro)
      erros.push(`Contrato ${c.numero}: descreva o "Outro" critério de seleção (critério ${CRITERIO_SELECAO_OUTROS}).`);

    // Limites de data do §4 (regras 4, 5 e 7).
    if (c.dataAssinatura < anosDepois(hojeISO, -20))
      erros.push(`Contrato ${c.numero}: a data de assinatura não pode ser anterior a ${anosDepois(hojeISO, -20)}.`);
    if (c.vigenciaDataInicial < anosDepois(hojeISO, -20) || c.vigenciaDataInicial > anosDepois(hojeISO, 2))
      erros.push(
        `Contrato ${c.numero}: o início da vigência deve estar entre ${anosDepois(hojeISO, -20)} e ${anosDepois(hojeISO, 2)}.`,
      );
    if (c.vigenciaDataFinal) {
      if (c.vigenciaDataFinal < c.vigenciaDataInicial)
        erros.push(`Contrato ${c.numero}: o fim da vigência não pode ser anterior ao início.`);
      else if (c.vigenciaDataFinal > anosDepois(c.vigenciaDataInicial, 10))
        erros.push(`Contrato ${c.numero}: a vigência não pode passar de 10 anos a partir do início.`);
    }
  }

  // --- Declarações: o schema exige CNPJ da empresa E CPF do dirigente ---
  if (d.declaracoesBloco?.houveContratacao) {
    for (const e of d.declaracoesBloco.empresasPertencentes) {
      if (!e.cnpj || !e.cpf)
        erros.push('Declarações: informe o CNPJ da empresa e o CPF do dirigente em cada empresa contratada.');
    }
  }

  // --- Certidões: identificação com exatamente 10 dígitos ---
  const certidoes: Array<[string, string | null | undefined]> = [
    ['Dados gerais da entidade', d.dadosGerais?.identCertidaoDadosGerais],
    ['Corpo diretivo', d.dadosGerais?.identCertidaoCorpoDiretivo],
    ['Membros do conselho', d.dadosGerais?.identCertidaoMembrosConselho],
    ['Responsáveis (entidade)', d.dadosGerais?.identCertidaoResponsaveis],
    ['Responsáveis (órgão concessor)', d.responsaveis?.identCertidaoResponsaveis],
    ['Comissão de avaliação', d.responsaveis?.identCertidaoComissaoAvaliacao],
    ['Controle interno', d.responsaveis?.identCertidaoControleInterno],
    ['Fiscalização da execução', d.responsaveis?.identCertidaoFiscalizacaoExecucao],
    ['Parecer conclusivo', d.parecer?.identificacaoParecer],
  ];
  for (const [rotulo, valor] of certidoes) {
    if (valor && !/^\d{10}$/.test(valor))
      erros.push(`Certidão "${rotulo}": a identificação deve ter exatamente 10 dígitos.`);
  }

  // --- Parecer conclusivo ---
  if (d.parecer) {
    const p = d.parecer;
    if (p.conclusaoParecer === 3 && !p.consideracoesParecer)
      erros.push('Parecer conclusivo: considerações são obrigatórias quando a conclusão é desfavorável.');
    const respondidos = new Set(p.declaracoes.filter((x) => x.declaracao != null).map((x) => x.tipoDeclaracao));
    for (let tipo = 1; tipo <= 7; tipo++) if (!respondidos.has(tipo)) erros.push(`Parecer conclusivo: responda a declaração ${tipo} (todas as 7 são obrigatórias).`);
    for (const x of p.declaracoes) {
      if ((x.declaracao === 2 || x.declaracao === 3) && !x.justificativa)
        erros.push(`Parecer conclusivo (declaração ${x.tipoDeclaracao}): justificativa obrigatória quando "Não" ou "Prejudicado".`);
      if (x.tipoDeclaracao === 7 && x.declaracao === 1 && !x.justificativa)
        erros.push('Parecer conclusivo: justificativa obrigatória quando houve aplicação de sanções.');
    }
  }

  // --- Transparência: se mantém sítio, tudo deve ser informado ---
  if (d.transparencia?.mantemSitio) {
    const t = d.transparencia;
    if (!t.sitios.length) erros.push('Transparência: informe ao menos um sítio na Internet.');
    const completa = (lista: Array<{ requisito: number }>, total: number) => new Set(lista.map((r) => r.requisito)).size >= total;
    if (!completa(t.requisitos781, 8)) erros.push('Transparência: informe todos os requisitos dos Arts. 7º e 8º § 1º (1 a 8).');
    if (!completa(t.requisitos83, 6)) erros.push('Transparência: informe todos os requisitos do Art. 8º § 3º (1 a 6).');
    if (!completa(t.requisitosDivulgacao, 10)) erros.push('Transparência: informe todos os requisitos de Divulgação das Informações (1 a 10).');
  }

  // --- Relatório Final: conclusão se houve emissão; justificativa se desfavorável ---
  if (d.relatorioFinal?.houveEmissao) {
    if (d.relatorioFinal.conclusao == null) erros.push('Relatório final: informe a conclusão quando houve emissão.');
    if (d.relatorioFinal.conclusao === 3 && !d.relatorioFinal.justificativa)
      erros.push('Relatório final: justificativa obrigatória quando a conclusão é desfavorável.');
  }

  return erros;
}

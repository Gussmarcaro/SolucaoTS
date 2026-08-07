import type { DadosMontagem } from './tipos';

/**
 * Espelha as regras de negócio do manual v1.19 que devem ser corrigidas ANTES
 * de transmitir (falhar cedo — §12: ~75% das remessas do 1º ano foram
 * rejeitadas por falta de teste). Retorna a lista de erros bloqueantes.
 * Complementa as validações por bloco (feitas na captura de cada item).
 */
export function validarPrestacao(d: DadosMontagem): string[] {
  const erros: string[] = [];
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

  // --- Documentos fiscais: encargos < bruto; rateio exige percentual ---
  for (const f of d.documentosFiscais) {
    if (f.valorEncargos >= f.valorBruto)
      erros.push(`Documento fiscal ${f.numero}: o valor dos encargos deve ser menor que o valor bruto.`);
    if (f.rateioProveniente && f.rateioPercentual == null)
      erros.push(`Documento fiscal ${f.numero}: informe o percentual de rateio (proveniente de rateio).`);
  }

  // --- Glosas: todo documento fiscal informado precisa de análise ---
  const analisados = new Set(d.glosas.filter((g) => !g.pagamentoData).map((g) => chaveDoc(g.docNumero, g.docCredorTipo, g.docCredorNumero)));
  for (const f of d.documentosFiscais) {
    if (!analisados.has(chaveDoc(f.numero, f.credorTipoDoc, f.credorNumeroDoc)))
      erros.push(`Glosas: falta a análise do documento fiscal ${f.numero} (todo documento fiscal deve ser analisado).`);
  }
  for (const g of d.glosas) {
    if (g.resultadoAnalise === 'APROVADO_PARCIALMENTE' && g.valorGlosa == null)
      erros.push('Glosas: informe o valor da glosa quando o resultado for "Aprovado parcialmente".');
  }

  // --- Repasses: justificativa quando valor difere do previsto ---
  for (const r of d.repasses) {
    if (r.valorPrevisto !== r.valorRepasse && !r.justificativaDiferenca)
      erros.push('Repasses: informe a justificativa quando o valor do repasse difere do previsto.');
    if (r.tipoDocumentoBancario === 2 && !r.descricaoOutros)
      erros.push('Repasses: descreva o documento bancário quando o tipo for "Outros".');
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
    if (c.naturezaContratacao.includes(23) && !c.naturezaOutro)
      erros.push(`Contrato ${c.numero}: descreva os "Outros Serviços" (natureza 23).`);
    if (c.criterioSelecao === 4 && !c.criterioSelecaoOutro)
      erros.push(`Contrato ${c.numero}: descreva o "Outro" critério de seleção (critério 4).`);
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

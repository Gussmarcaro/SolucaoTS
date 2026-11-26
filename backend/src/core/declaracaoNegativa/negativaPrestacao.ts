/**
 * Quais ajustes pedem Declaração Negativa **da prestação de contas** num
 * exercício (manual v1.19, §2.8).
 *
 * "O início da obrigatoriedade da prestação de contas é definido pela data da
 * assinatura do ajuste. Caso o ajuste não tenha repasse no(s) exercício(s)
 * inicial(ais) deverá ser enviada a Declaração Negativa."
 *
 * Daí as três condições da sugestão:
 *
 * 1. o ajuste foi assinado até o fim do exercício;
 * 2. o exercício é **inicial**: o ajuste ainda não tem prestação de contas
 *    (com repasse) de nenhum exercício anterior;
 * 3. não há sinal de repasse no exercício — nenhum empenho do ajuste emitido
 *    nele. Com empenho, o mais provável é que haja prestação a fazer.
 *
 * É uma sugestão, não um veredito: o sistema só conhece os empenhos que estão
 * cadastrados. A confirmação é de quem cria a negativa.
 */

export type SituacaoNegativaPrestacao =
  /** Já existe a negativa do exercício. */
  | 'NEGATIVA'
  /** Já existe a prestação de contas do exercício. */
  | 'PRESTACAO'
  /** Sem prestação, sem empenho no ano, exercício inicial: cabe a negativa. */
  | 'SUGERIDA'
  /** Sem prestação, mas há empenho no ano: provavelmente é prestação. */
  | 'COM_EMPENHO';

export interface AjusteParaNegativa {
  ajusteId: string;
  codigoAjuste: string;
  tipoAjuste: string;
  entidadeNome: string;
  /** `aaaa-mm-dd` */
  dataAssinatura: string;
  vigenciaFinal: string | null;
  /** Exercícios com prestação comum (não negativa), qualquer status. */
  anosComPrestacao: number[];
  /** Negativa do exercício pedido, se existir. */
  negativaNoAno: { prestacaoId: string; status: string } | null;
  prestacaoNoAnoId: string | null;
  empenhosNoAno: number;
}

export interface LinhaNegativaPrestacao {
  ajusteId: string;
  codigoAjuste: string;
  tipoAjuste: string;
  entidadeNome: string;
  dataAssinatura: string;
  situacao: SituacaoNegativaPrestacao;
  prestacaoId: string | null;
  status: string | null;
  empenhosNoAno: number;
}

const ORDEM: Record<SituacaoNegativaPrestacao, number> = { SUGERIDA: 0, COM_EMPENHO: 1, NEGATIVA: 2, PRESTACAO: 3 };

export function negativasDoExercicio(ajustes: AjusteParaNegativa[], ano: number): LinhaNegativaPrestacao[] {
  const linhas: LinhaNegativaPrestacao[] = [];
  for (const a of ajustes) {
    // Assinado depois do exercício: não há obrigação nenhuma nele.
    if (Number(a.dataAssinatura.slice(0, 4)) > ano) continue;
    // Vigência terminada antes do exercício: o ajuste já não presta contas dele.
    if (a.vigenciaFinal && Number(a.vigenciaFinal.slice(0, 4)) < ano) continue;

    const base = {
      ajusteId: a.ajusteId,
      codigoAjuste: a.codigoAjuste,
      tipoAjuste: a.tipoAjuste,
      entidadeNome: a.entidadeNome,
      dataAssinatura: a.dataAssinatura,
      empenhosNoAno: a.empenhosNoAno,
    };

    if (a.negativaNoAno) {
      linhas.push({ ...base, situacao: 'NEGATIVA', prestacaoId: a.negativaNoAno.prestacaoId, status: a.negativaNoAno.status });
      continue;
    }
    if (a.prestacaoNoAnoId) {
      linhas.push({ ...base, situacao: 'PRESTACAO', prestacaoId: a.prestacaoNoAnoId, status: null });
      continue;
    }
    // Já prestou contas de um exercício anterior: este não é mais "inicial".
    if (a.anosComPrestacao.some((x) => x < ano)) continue;

    linhas.push({
      ...base,
      situacao: a.empenhosNoAno > 0 ? 'COM_EMPENHO' : 'SUGERIDA',
      prestacaoId: null,
      status: null,
    });
  }
  return linhas.sort((x, y) => ORDEM[x.situacao] - ORDEM[y.situacao] || x.codigoAjuste.localeCompare(y.codigoAjuste));
}

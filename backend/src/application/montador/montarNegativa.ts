import type { Pendencia, ResultadoMontagem } from './tipos';
import { TIPO_DOCUMENTO } from './montarPrestacao';

/**
 * Declaração Negativa **da Prestação de Contas** (manual v1.19, §2.8 e §36).
 *
 * "O início da obrigatoriedade da prestação de contas é definido pela data da
 * assinatura do ajuste. Caso o ajuste não tenha repasse no(s) exercício(s)
 * inicial(ais) deverá ser enviada a Declaração Negativa do ajuste para o(s)
 * exercício(s) em questão."
 *
 * O documento é só o descritor e o código do ajuste. Vai por
 * `/f5/declaracao-negativa`, e uma prestação enviada depois para o mesmo
 * exercício a sobrescreve (se não houver prestação de exercício posterior).
 *
 * Não confundir com a negativa **do módulo Ajustes**, por tipo e período, que
 * se faz na tela do Audesp (`core/declaracaoNegativa`).
 */
export interface DadosNegativa {
  ano: number;
  tipoAjuste: string;
  codigoAjuste: string;
  municipio: number | null;
  entidade: number | null;
  /** `aaaa-mm-dd` */
  dataAssinatura: string;
  /** Empenhos do ajuste emitidos no exercício (cadastro do ajuste). */
  empenhosNoAno: number;
  /** Linhas lançadas nos blocos da prestação — a negativa não leva nenhuma. */
  repassesLancados: number;
}

export function montarDeclaracaoNegativa(d: DadosNegativa): ResultadoMontagem {
  const erros: string[] = [];
  if (d.municipio == null || d.entidade == null)
    erros.push('Descritor: código de município/entidade do órgão não informado (vem do cadastro do órgão).');

  const descritor: Record<string, unknown> = {
    tipo_documento: TIPO_DOCUMENTO[d.tipoAjuste] ?? d.tipoAjuste,
    ano: d.ano,
    mes: 12,
  };
  if (d.municipio != null) descritor.municipio = d.municipio;
  if (d.entidade != null) descritor.entidade = d.entidade;

  // Ordem do exemplo oficial: tipo, município, entidade, ano, mês.
  const ordenado = Object.fromEntries(
    ['tipo_documento', 'municipio', 'entidade', 'ano', 'mes'].filter((k) => k in descritor).map((k) => [k, descritor[k]]),
  );

  return { documento: { descritor: ordenado, codigo_ajuste: d.codigoAjuste }, erros, avisos: [] };
}

/**
 * O que a conferência diz de uma negativa. Ela não tem blocos, então as
 * perguntas são outras: o exercício é um dos iniciais do ajuste? Houve
 * repasse nele?
 */
export function conferirNegativa(d: DadosNegativa): Pendencia[] {
  const p: Pendencia[] = [];
  const anoAssinatura = Number(d.dataAssinatura.slice(0, 4));

  if (d.ano < anoAssinatura)
    p.push({
      bloco: null,
      severidade: 'IMPEDE',
      titulo: `O ajuste foi assinado em ${anoAssinatura}: não há obrigação de prestar contas de ${d.ano}, nem negativa.`,
    });

  if (d.repassesLancados > 0)
    p.push({
      bloco: null,
      severidade: 'IMPEDE',
      titulo:
        'Há repasse lançado nesta prestação. A negativa é só para o exercício sem repasse — com repasse, o que se envia é a prestação de contas.',
    });

  if (d.empenhosNoAno > 0)
    p.push({
      bloco: null,
      severidade: 'ATENCAO',
      titulo: `O ajuste tem ${d.empenhosNoAno} empenho(s) emitido(s) em ${d.ano}. Confirme que não houve repasse no exercício antes de enviar a negativa.`,
    });

  return p;
}

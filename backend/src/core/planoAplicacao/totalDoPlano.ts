/**
 * O total do Plano de Aplicação tem de coincidir com o valor do ajuste.
 *
 * É a conferência que ninguém faz à mão e que erra de um jeito específico: o
 * plano é digitado **mensal** e somado **anual**, então confundir as duas
 * colunas multiplica o plano pelo número de competências sem nada parecer
 * errado — um ajuste de R$ 1,5 mi recebe um plano de R$ 12 mi, e os dois
 * números são plausíveis olhando para a tela.
 *
 * ## Duas decisões que a conta carrega
 *
 * **A base não é o `valorGlobal` cru.** O termo aditivo acresce e suprime
 * (`valorAcrescido`, `valorSuprimido`), e comparar contra o valor original
 * acusaria de errado justamente o ajuste que foi aditivado — o caso em que o
 * plano **precisa** mudar.
 *
 * **A soma é de todos os exercícios, não de um.** O valor global cobre a
 * vigência inteira, e uma vigência de 01/05/2026 a 30/04/2027 atravessa dois
 * exercícios. Conferir ano a ano compararia contra um teto que o ajuste não
 * declara: ele não diz quanto cabe a 2026 e quanto a 2027.
 */

/** Tolerância da comparação, em reais. */
const FOLGA = 0.005;

export interface AditivoDeValor {
  valorAcrescido: number | null;
  valorSuprimido: number | null;
}

/**
 * Quanto o ajuste vale **hoje**: o global mais os acréscimos, menos as
 * supressões dos termos aditivos.
 */
export function valorGlobalEfetivo(valorGlobal: number, aditivos: AditivoDeValor[]): number {
  const delta = aditivos.reduce(
    (s, a) => s + (a.valorAcrescido ?? 0) - (a.valorSuprimido ?? 0),
    0,
  );
  return Math.round((valorGlobal + delta) * 100) / 100;
}

export type SituacaoPlano = 'CONFERE' | 'SEM_PLANO' | 'A_MENOR' | 'A_MAIOR';

export interface ConferenciaDoPlano {
  situacao: SituacaoPlano;
  totalPlano: number;
  valorAjuste: number;
  /** Positiva quando o plano passou do ajuste; negativa quando falta. */
  diferenca: number;
  confere: boolean;
}

/**
 * Compara o total do plano com o valor do ajuste.
 *
 * **"Sem plano" é separado de "a menor"**, e não é preciosismo: são conversas
 * diferentes. Quem não cadastrou nada precisa ouvir "cadastre o plano"; quem
 * cadastrou menos do que devia precisa ouvir *quanto* falta — e lê a primeira
 * mensagem como se o trabalho dele tivesse sumido.
 */
export function conferirTotalDoPlano(totalPlano: number, valorAjuste: number): ConferenciaDoPlano {
  /*
   * Entrada que não é número vira zero, e zero vira `SEM_PLANO`.
   *
   * Sem isto, um `undefined` que chegasse por qualquer caminho produzia `NaN`,
   * e **toda** comparação com `NaN` é falsa: a cascata caía no último ramo e
   * acusava o plano de estar "a maior". Acusar quem não tem plano de ter
   * gastado demais é o pior jeito possível de errar aqui — e foi assim que o
   * `verificar:conferencia` reprovou quatro casos de uma vez.
   */
  const total = Number.isFinite(totalPlano) ? Math.round(totalPlano * 100) / 100 : 0;
  const ajuste = Number.isFinite(valorAjuste) ? Math.round(valorAjuste * 100) / 100 : 0;
  const diferenca = Math.round((total - ajuste) * 100) / 100;

  const situacao: SituacaoPlano =
    total <= 0 ? 'SEM_PLANO' : Math.abs(diferenca) <= FOLGA ? 'CONFERE' : diferenca < 0 ? 'A_MENOR' : 'A_MAIOR';

  return { situacao, totalPlano: total, valorAjuste: ajuste, diferenca, confere: situacao === 'CONFERE' };
}

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * A frase que a tela e o erro do servidor usam.
 *
 * Fica aqui, e não em cada lugar que a exibe, porque são **três** — o alerta do
 * formulário, o bloqueio ao marcar o ajuste como enviado e a pendência da
 * conferência da prestação. Três textos para o mesmo fato divergiriam, e o
 * usuário leria duas explicações diferentes do mesmo número.
 */
export function explicarPlano(c: ConferenciaDoPlano): string {
  switch (c.situacao) {
    case 'CONFERE':
      return `O Plano de Aplicação soma ${moeda(c.totalPlano)}, igual ao valor do ajuste.`;
    case 'SEM_PLANO':
      return `O Plano de Aplicação não foi cadastrado. O ajuste vale ${moeda(c.valorAjuste)}.`;
    case 'A_MENOR':
      return (
        `O Plano de Aplicação soma ${moeda(c.totalPlano)} e o ajuste vale ${moeda(c.valorAjuste)} — ` +
        `faltam ${moeda(Math.abs(c.diferenca))}.`
      );
    case 'A_MAIOR':
      return (
        `O Plano de Aplicação soma ${moeda(c.totalPlano)} e o ajuste vale ${moeda(c.valorAjuste)} — ` +
        `${moeda(c.diferenca)} a mais.`
      );
  }
}

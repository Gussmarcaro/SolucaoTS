/**
 * Quais meses do calendário a vigência realmente ocupa — **espelho do backend**
 * (`core/vigencia/mesesEfetivos.ts`).
 *
 * **A regra:** um mês entra quando a vigência cobre **a maior parte dos dias
 * dele**.
 *
 * Um convênio de 29/01/2026 a 28/01/2027 dura doze meses, mas encosta em
 * treze do calendário: três dias de janeiro de 2026 numa ponta, vinte e oito
 * de janeiro de 2027 na outra. Contando mês a mês, o Plano de Metas ganhava um
 * período de janeiro indistinguível de um mês inteiro, e o Plano de Aplicação
 * replicava o valor mensal em treze competências — estourando o valor global.
 * A tela do TCESP gera doze, de fevereiro/2026 a janeiro/2027.
 *
 * **Não é reancorar na vigência:** o período continua sendo a casa do ano
 * civil. O dia só decide se a ponta tem lugar no quadro — ver a nota longa no
 * arquivo do backend.
 *
 * Está aqui porque as duas telas calculam **enquanto se digita**: o quadro de
 * períodos da meta se desenha ao escolher a periodicidade, e o anual da
 * rubrica ao digitar o mensal. Divergindo do servidor, a tela oferece períodos
 * que ele recusa e promete um anual que ele não grava.
 */

export interface DiaRef {
  ano: number;
  mes: number;
  dia: number;
}

export interface MesRef {
  ano: number;
  mes: number;
}

/** Dias do mês, em UTC — as datas da vigência não têm hora. */
export const diasNoMes = (ano: number, mes: number): number =>
  new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Ano, mês e dia de 'YYYY-MM-DD', lidos do texto: `Date` deslocaria o fuso. */
export function diaRef(iso: string): DiaRef | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { ano: Number(m[1]), mes, dia };
}

/** `true` quando `fim` precede `inicio` — cadastro pela metade, não janela. */
export const vigenciaInvertida = (inicio: DiaRef, fim: DiaRef): boolean =>
  fim.ano < inicio.ano ||
  (fim.ano === inicio.ano && (fim.mes < inicio.mes || (fim.mes === inicio.mes && fim.dia < inicio.dia)));

const indice = (m: MesRef): number => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesRef => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

/**
 * A janela de meses da vigência, já descartadas as pontas minoritárias.
 *
 * O início desempata para **dentro** (`>=`) e o fim para **fora** (`>`): as
 * duas pontas se completam, então uma vigência de doze meses dá sempre doze
 * competências, mesmo quando o mês se parte exatamente ao meio.
 */
export function janelaEfetiva(inicio: DiaRef, fim: DiaRef): { de: MesRef; ate: MesRef } {
  const iInicio = indice(inicio);
  const iFim = indice(fim);

  // Vigência dentro de um mês só: não há para onde empurrar.
  if (iInicio === iFim) {
    return { de: { ano: inicio.ano, mes: inicio.mes }, ate: { ano: fim.ano, mes: fim.mes } };
  }

  const diasDoPrimeiro = diasNoMes(inicio.ano, inicio.mes);
  const diasDoUltimo = diasNoMes(fim.ano, fim.mes);

  const cobrePrimeiro = diasDoPrimeiro - inicio.dia + 1;
  const cobreUltimo = fim.dia;

  const de = cobrePrimeiro * 2 >= diasDoPrimeiro ? iInicio : iInicio + 1;
  const ate = cobreUltimo * 2 > diasDoUltimo ? iFim : iFim - 1;

  // Vigência curta a cavalo de dois meses, sem maioria em nenhum: fica o de
  // maior presença, para a meta não ficar sem período nenhum.
  if (de > ate) {
    const i = cobrePrimeiro >= cobreUltimo ? iInicio : iFim;
    return { de: doIndice(i), ate: doIndice(i) };
  }

  return { de: doIndice(de), ate: doIndice(ate) };
}

/**
 * Quantos dias de vigência ficaram **fora** do quadro, em cada ponta.
 *
 * Eles não somem da execução: não têm período próprio, e são apurados junto do
 * período vizinho — que é o que a entidade já faz ao apresentar "29/01 a
 * 28/02" como o primeiro mês. A tela precisa dizer isso, porque "a parceria
 * começou em janeiro e o quadro começa em fevereiro" é exatamente a dúvida que
 * leva alguém a achar que falta um período.
 */
export function diasAbsorvidos(
  inicio: string | null | undefined,
  fim: string | null | undefined,
): { noInicio: number; noFim: number } {
  const vazio = { noInicio: 0, noFim: 0 };
  const de = inicio ? diaRef(inicio) : null;
  const ate = fim ? diaRef(fim) : null;
  if (!de || !ate || vigenciaInvertida(de, ate)) return vazio;

  const janela = janelaEfetiva(de, ate);
  return {
    noInicio: janela.de.mes === de.mes && janela.de.ano === de.ano ? 0 : diasNoMes(de.ano, de.mes) - de.dia + 1,
    noFim: janela.ate.mes === ate.mes && janela.ate.ano === ate.ano ? 0 : ate.dia,
  };
}

/**
 * As competências que um exercício do plano cobre — **espelho do backend**.
 *
 * A mesma regra está em `core/planoAplicacao/competencias.ts`, e é deliberado:
 * a tela mostra o **anual** de cada rubrica enquanto se digita o mensal, muito
 * antes de enviar. Pedir o multiplicador ao servidor a cada tecla trocaria uma
 * multiplicação por uma ida à rede.
 *
 * **O preço é a divergência**, e aqui ela é cara: se os dois lados discordarem,
 * a tela promete um anual e o servidor grava outro — e o plano é o teto contra
 * o qual a despesa é conferida. `planoAplicacao.test.ts` trava os mesmos casos
 * dos dois lados.
 */

export interface JanelaDoExercicio {
  /** Primeiro e último mês (1-12) que o plano cobre naquele ano. */
  primeiro: number;
  ultimo: number;
  /** Quantos meses — o multiplicador do anual. */
  meses: number;
  /** `true` quando a vigência recorta o ano (não são 12 meses cheios). */
  parcial: boolean;
}

import { diaRef, janelaEfetiva, vigenciaInvertida } from './vigencia';

/**
 * A janela do exercício, recortada pela vigência do ajuste.
 *
 * Um convênio de 01/06/2026 a 31/05/2027 tem **sete** competências em 2026 e
 * **cinco** em 2027 — não doze em cada. E o **dia** conta na ponta: um de
 * 29/01/2026 a 28/01/2027 tem onze em 2026 e uma em 2027, porque três dias de
 * janeiro não comportam um mês de rubrica. Sem isso o plano declara mais que o
 * pactuado, o total do exercício não bate com o valor global, e o "execução ×
 * plano" compara a despesa real contra um teto que não existe.
 *
 * **Sem vigência cadastrada, o ano é cheio**: ajuste antigo pode não ter as
 * datas, e a regra nova não pode trancar o cadastro que existia antes dela.
 *
 * `null` quando a vigência existe e **não alcança** o exercício — não é um
 * plano menor, é um plano de um ano em que a parceria não vigora.
 */
export function janelaDoExercicio(
  ano: number,
  vigenciaInicial: string | null | undefined,
  vigenciaFinal: string | null | undefined,
): JanelaDoExercicio | null {
  const cheio: JanelaDoExercicio = { primeiro: 1, ultimo: 12, meses: 12, parcial: false };

  const de = vigenciaInicial ? diaRef(vigenciaInicial) : null;
  const ate = vigenciaFinal ? diaRef(vigenciaFinal) : null;
  if (!de || !ate) return cheio;

  // Vigência invertida é cadastro pela metade, não janela menor.
  if (vigenciaInvertida(de, ate)) return cheio;

  // A ponta que só encosta em poucos dias do mês não ganha competência.
  const { de: ini, ate: fim } = janelaEfetiva(de, ate);

  if (ano < ini.ano || ano > fim.ano) return null;

  const primeiro = ano === ini.ano ? ini.mes : 1;
  const ultimo = ano === fim.ano ? fim.mes : 12;
  if (primeiro > ultimo) return null;

  const meses = ultimo - primeiro + 1;
  return { primeiro, ultimo, meses, parcial: meses < 12 };
}

const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** "jun/2026 a dez/2026 · 7 competências" — o período que o plano vai cobrir. */
export function rotuloJanela(ano: number, j: JanelaDoExercicio): string {
  const de = `${MESES_ABREV[j.primeiro - 1]}/${ano}`;
  const ate = `${MESES_ABREV[j.ultimo - 1]}/${ano}`;
  const periodo = j.primeiro === j.ultimo ? de : `${de} a ${ate}`;
  return `${periodo} · ${j.meses} ${j.meses === 1 ? 'competência' : 'competências'}`;
}

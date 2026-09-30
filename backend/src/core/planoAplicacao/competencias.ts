/**
 * Quais meses de um exercício o plano de aplicação cobre.
 *
 * O plano digitado informa **um valor mensal por rubrica** e o sistema o expande
 * nas competências do ano. Até aqui a expansão era sempre `1..12`, e o anual era
 * sempre `mensal × 12` — o que está errado no caso mais comum de todos: o ajuste
 * assinado no meio do ano.
 *
 * Um convênio com vigência de 01/06/2026 a 31/05/2027 tem **sete** competências
 * em 2026 e **cinco** em 2027. Gravando doze em cada, o plano declara mais que o
 * pactuado, o total do exercício não bate com o valor global do ajuste, e a
 * conferência "execução × plano" compara a despesa real contra um teto que não
 * existe.
 *
 * Função pura para poder ser conferida sem banco: o número de meses multiplica
 * dinheiro, e errá-lo não quebra tela nenhuma.
 */

export interface JanelaDoExercicio {
  /** Primeiro e último mês (1-12) que o plano deve cobrir naquele ano. */
  primeiro: number;
  ultimo: number;
  /** Quantos meses — o multiplicador do anual. */
  meses: number;
  /**
   * `true` quando a vigência recorta o ano (não são os 12 meses cheios).
   *
   * A tela usa isto para dizer *por que* o anual não é doze vezes o mensal —
   * um multiplicador diferente do esperado, sem explicação, parece defeito.
   */
  parcial: boolean;
}

/** Ano e mês de uma data 'YYYY-MM-DD', sem passar por `Date` (que desloca fuso). */
function anoMes(iso: string): { ano: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const mes = Number(m[2]);
  return mes >= 1 && mes <= 12 ? { ano: Number(m[1]), mes } : null;
}

/**
 * A janela do exercício, recortada pela vigência do ajuste.
 *
 * **Sem vigência cadastrada, o ano é cheio.** Ajuste antigo pode não ter as
 * datas, e recusar o plano por causa disso trancaria quem hoje consegue
 * salvar — a regra nova não pode punir o cadastro que existia antes dela.
 *
 * Devolve `null` quando a vigência existe e **não alcança** o exercício: não é
 * um plano menor, é um plano de um ano em que a parceria não vigora.
 */
export function janelaDoExercicio(
  ano: number,
  vigenciaInicial: string | null | undefined,
  vigenciaFinal: string | null | undefined,
): JanelaDoExercicio | null {
  const cheio: JanelaDoExercicio = { primeiro: 1, ultimo: 12, meses: 12, parcial: false };

  const ini = vigenciaInicial ? anoMes(vigenciaInicial) : null;
  const fim = vigenciaFinal ? anoMes(vigenciaFinal) : null;
  if (!ini || !fim) return cheio;

  // A vigência inteira passa ao largo do exercício.
  if (ano < ini.ano || ano > fim.ano) return null;

  const primeiro = ano === ini.ano ? ini.mes : 1;
  const ultimo = ano === fim.ano ? fim.mes : 12;
  if (primeiro > ultimo) return null;

  const meses = ultimo - primeiro + 1;
  return { primeiro, ultimo, meses, parcial: meses < 12 };
}

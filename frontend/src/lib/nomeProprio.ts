/**
 * Partículas que ficam em minúscula no meio de um nome — "Luís Carlos **da**
 * Silva". No começo do nome elas são maiúsculas ("Da Silva Comércio"), então a
 * regra só vale a partir da segunda palavra.
 */
const PARTICULAS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'di',
  'du',
  'del',
  'della',
  'la',
  'le',
  'van',
  'von',
  'y',
]);

/** Só a primeira letra sobe; o resto da palavra fica como foi digitado. */
function capitalizarPalavra(palavra: string): string {
  // Nomes compostos por hífen sobem dos dois lados: "Ana-Maria".
  return palavra.replace(/(^|-)(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * Ajusta um nome próprio **enquanto se digita**: sobe a inicial de cada palavra
 * e deixa as partículas em paz.
 *
 * A função só **aumenta** letras, nunca diminui. Duas consequências desejadas:
 *
 * - quem digita em CAIXA ALTA continua em caixa alta (razões sociais e nomes de
 *   órgãos costumam ser assim), em vez de ver o texto ser reescrito;
 * - digitar "denise" não trava em "de": a partícula apenas não é promovida, e
 *   assim que a palavra deixa de ser "de" a inicial sobe normalmente.
 *
 * O comprimento nunca muda, então o cursor não salta ao digitar no meio do
 * texto.
 */
export function capitalizarNome(valor: string): string {
  if (!valor) return valor;
  // O split com captura preserva os espaços — inclusive o que ainda está sendo
  // digitado no fim.
  const partes = valor.split(/(\s+)/);
  let indicePalavra = 0;
  return partes
    .map((parte) => {
      if (!parte || /^\s+$/.test(parte)) return parte;
      const ehParticula = PARTICULAS.has(parte.toLowerCase());
      const primeira = indicePalavra === 0;
      indicePalavra += 1;
      return ehParticula && !primeira ? parte : capitalizarPalavra(parte);
    })
    .join('');
}

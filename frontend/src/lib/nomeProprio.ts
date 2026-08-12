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
 * e **rebaixa as partículas** — "Carlos Amaral Da Silva" vira "Carlos Amaral da
 * Silva", tanto faz como o "Da" foi digitado.
 *
 * A única exceção é o texto inteiro em CAIXA ALTA, que fica intacto. Razões
 * sociais e nomes de órgão costumam ser escritos assim de propósito
 * ("PREFEITURA MUNICIPAL DE ADAMANTINA"), e rebaixar só a partícula deixaria um
 * "de" solto no meio das maiúsculas.
 *
 * O comprimento nunca muda, então o cursor não salta ao digitar no meio do
 * texto.
 */
export function capitalizarNome(valor: string): string {
  if (!valor) return valor;

  // Sem nenhuma minúscula, quem digitou quis caixa alta: só respeita.
  if (!/\p{Ll}/u.test(valor)) return valor;

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
      // A partícula só é rebaixada no meio do nome: no começo ela é o próprio
      // nome ("Da Silva Comércio").
      return ehParticula && !primeira ? parte.toLowerCase() : capitalizarPalavra(parte);
    })
    .join('');
}

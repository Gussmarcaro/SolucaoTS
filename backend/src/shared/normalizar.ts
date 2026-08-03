const ACENTOS = /[̀-ͯ]/g; // combining diacritical marks

/**
 * Normaliza um texto para busca insensivel a acentos, caixa e pontuacao.
 * Ex.: "MARCIO O." -> "marcio o"; "Sao Paulo" -> "sao paulo".
 */
export function normalizarTexto(texto: string): string {
  return (texto ?? '')
    .normalize('NFD') // separa letra e acento
    .replace(ACENTOS, '') // remove os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // pontuacao/simbolos viram espaco
    .replace(/\s+/g, ' ')
    .trim();
}

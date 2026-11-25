/**
 * Ordem "natural": números dentro do texto comparados como números.
 *
 * O código da meta é texto no banco ("1", "2", "10", "1.1"), e o `orderBy` do
 * banco o ordena letra a letra: **1, 10, 11, 2, 3**. Para quem lê, é a lista
 * fora de ordem — e é a primeira coisa que se nota numa parceria com dez metas
 * ou mais. Aqui "2" vem antes de "10", e "1.2" antes de "1.10".
 *
 * Sem acento e sem caixa influírem (`sensitivity: 'base'`), pela mesma razão
 * da busca: "Meta" e "meta" não são duas coisas.
 */
const COLADOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export const compararNatural = (a: string, b: string): number => COLADOR.compare(a, b);

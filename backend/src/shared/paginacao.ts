/**
 * Limites de paginação, em um lugar só.
 *
 * Estavam repetidos em 13 casos de uso: 13 lugares para mudar, e um esquecido
 * bastava para uma tela ficar fora do padrão.
 *
 * O teto de 100 é o que a interface pode oferecer no seletor de página. Os dois
 * números precisam andar juntos — um teto abaixo do que a tela oferece recorta
 * a consulta em silêncio, e o usuário vê "500 por página" mostrando 100.
 */
export const PAGE_SIZE_PADRAO = 15;
export const PAGE_SIZE_MAX = 100;

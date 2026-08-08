/**
 * Tabelas de domínio do documento JSON da prestação de contas (Fase V).
 *
 * **GERADO AUTOMATICAMENTE — não edite à mão.** Rode `npm run dominios:fase-v`
 * no backend após atualizar os schemas em `src/infrastructure/tcesp/schemas/`.
 *
 * Fonte: JSON Schema oficial do Audesp, versão v1.14 — a mesma que o TCESP
 * usa para validar o documento no envio. Portanto código fora destas tabelas é
 * rejeitado na transmissão, e aqui é tratado como **erro**, não aviso.
 *
 * Só os códigos: os rótulos ficam no front (`lib/dominiosFaseV.ts`), gerado
 * pelo mesmo script a partir do mesmo schema.
 */

/** Documentos fiscais — `categoria_despesas_tipo`. */
export const CATEGORIA_DESPESA_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81,
  82, 83, 84, 85, 86, 87, 88, 89,
]);

/** Pagamentos, Receitas, Empenhos e Ajustes de Saldo — `fonte_recurso_tipo`.
 * A série 91–98 repete a 1–8 para recursos de exercícios anteriores. */
export const FONTE_RECURSO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 91, 92, 93, 94, 95, 96, 97, 98,
]);

/** Documentos fiscais — `estado_emissor` (UF do emissor). */
export const ESTADO_EMISSOR_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
]);

/** Contratos — `natureza_contratacao` (aceita vários códigos por contrato). */
export const NATUREZA_CONTRATACAO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
]);

/** Contratos — `criterio_selecao`. */
export const CRITERIO_SELECAO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4,
]);

/** Contratos — `valor_tipo`. */
export const VALOR_TIPO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2,
]);

/** Contratos — `vigencia_tipo`. */
export const VIGENCIA_TIPO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2,
]);

/** Disponibilidades — `conta_tipo`. */
export const CONTA_TIPO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2,
]);

/** Devoluções — `natureza_devolucao_tipo`. */
export const NATUREZA_DEVOLUCAO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3,
]);

/** Repasses — `tipo_documento_bancario`. */
export const TIPO_DOCUMENTO_BANCARIO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3,
]);

/** Servidores cedidos — `onus_pagamento`. */
export const ONUS_PAGAMENTO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3,
]);

/** `documento_tipo` como código numérico. Na maioria dos blocos esse campo é
 * um enum do Prisma (ver `TIPO_DOCUMENTO` em `dominios.ts`); nos Ajustes de
 * Saldo, que guardam arrays Json crus, é gravado como número. */
export const DOCUMENTO_TIPO_COD_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3,
]);

/** `meio_pagamento_tipo` como código numérico (mesma observação acima). */
export const MEIO_PAGAMENTO_COD_CODIGOS: ReadonlySet<number> = new Set([
  1, 2,
]);

/** Bancos aceitos em Pagamentos, Disponibilidades e Repasses. */
export const BANCO_CODIGOS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 7, 8, 10, 11, 12, 14, 15, 16, 17, 18, 21, 24, 25, 27, 29, 31,
  33, 35, 36, 37, 38, 39, 40, 41, 44, 45, 47, 60, 62, 63, 64, 65, 66, 69, 70, 72,
  73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 87, 88, 89, 90, 92, 93, 94,
  95, 96, 97, 98, 99, 100, 101, 102, 104, 105, 107, 108, 111, 113, 114, 116, 117, 119, 120, 121,
  122, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 138, 139, 140, 141, 142, 143,
  144, 145, 146, 149, 151, 157, 159, 163, 173, 174, 175, 177, 180, 183, 184, 188, 189, 190, 191, 194,
  195, 196, 197, 204, 208, 210, 212, 213, 214, 215, 217, 218, 222, 224, 225, 229, 230, 233, 237, 241,
  243, 244, 246, 247, 248, 249, 250, 252, 253, 254, 259, 260, 263, 265, 266, 268, 269, 270, 271, 272,
  273, 274, 276, 278, 279, 280, 281, 283, 285, 286, 288, 289, 290, 291, 292, 293, 296, 298, 299, 300,
  301, 306, 307, 309, 310, 311, 312, 313, 318, 319, 320, 321, 322, 323, 324, 325, 326, 328, 329, 330,
  331, 332, 334, 335, 336, 340, 341, 342, 343, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 358,
  359, 360, 362, 363, 364, 365, 366, 367, 368, 370, 371, 373, 374, 376, 377, 378, 379, 380, 381, 382,
  383, 384, 385, 386, 387, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403,
  404, 406, 407, 408, 409, 410, 411, 412, 413, 414, 416, 418, 419, 421, 422, 423, 425, 426, 427, 428,
  429, 430, 433, 435, 438, 439, 440, 442, 443, 444, 445, 447, 448, 449, 450, 451, 452, 453, 454, 456,
  457, 458, 459, 460, 461, 462, 463, 464, 465, 467, 468, 469, 470, 471, 473, 475, 477, 478, 479, 481,
  484, 487, 488, 492, 494, 495, 505, 506, 508, 509, 511, 512, 518, 521, 522, 523, 524, 526, 527, 528,
  529, 530, 532, 534, 535, 536, 537, 539, 541, 542, 545, 546, 547, 600, 604, 610, 611, 612, 613, 623,
  626, 630, 633, 634, 637, 638, 641, 643, 650, 652, 653, 654, 655, 707, 712, 719, 720, 721, 724, 734,
  735, 738, 739, 740, 741, 743, 744, 745, 746, 747, 748, 749, 751, 752, 753, 754, 755, 756, 757, 999,
]);

/** Códigos "Outros", que exigem a descrição no campo livre correspondente. */
export const NATUREZA_CONTRATACAO_OUTROS = 23;
export const CRITERIO_SELECAO_OUTROS = 4;
export const TIPO_DOCUMENTO_BANCARIO_OUTROS = 2;

/**
 * Toda fonte de recurso do ajuste precisa de conta bancária própria.
 *
 * É regra do repasse: o recurso é alocado **por fonte**, e cada fonte tem a sua
 * conta específica — é assim que se prova, no extrato, que o dinheiro federal
 * não pagou o que era do municipal.
 *
 * O sistema já checava o sentido contrário — toda conta declara uma fonte, e
 * ela tem de estar entre as do ajuste. Faltava este: dava para declarar as
 * fontes 1, 2 e 5 e cadastrar conta só para a 1, e o ajuste passava inteiro.
 *
 * Função pura porque a resposta é usada em três lugares (a validação do ajuste,
 * a conferência da prestação e o aviso do formulário) e porque é barata de
 * conferir sem banco.
 */

/** Fontes declaradas que não têm nenhuma conta apontando para elas. */
export function fontesSemConta(
  fontesDoAjuste: number[],
  contas: { fonteRecursoTipo: number | null }[],
): number[] {
  // Conta sem fonte não cobre fonte nenhuma: ela é justamente o caso que a
  // validação de conta já recusa, e tratá-la como cobertura esconderia o furo.
  const cobertas = new Set(
    contas.map((c) => c.fonteRecursoTipo).filter((f): f is number => f !== null),
  );
  return [...new Set(fontesDoAjuste)].filter((f) => !cobertas.has(f)).sort((a, b) => a - b);
}

/** A frase que a validação, a conferência e a tela mostram. */
export function explicarFontesSemConta(fontes: number[]): string {
  if (fontes.length === 0) return '';
  const lista = fontes.join(', ');
  return fontes.length === 1
    ? `A fonte de recurso ${lista} não tem conta bancária cadastrada. Todo ajuste precisa de conta específica por fonte.`
    : `As fontes de recurso ${lista} não têm conta bancária cadastrada. Todo ajuste precisa de conta específica por fonte.`;
}

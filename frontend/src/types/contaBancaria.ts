/**
 * Conta bancária do órgão — o cadastro central.
 *
 * A mesma conta aparece em três lugares: na lista do Ajuste, no pagamento e no
 * extrato importado. Aqui ela é cadastrada uma vez; os outros escolhem dela.
 */
export interface ContaBancaria {
  id: string;
  clienteId: string | null;
  banco: number;
  agencia: string;
  conta: string;
  contaTipo: number | null;
  /** A fonte de recurso que entra nesta conta — o pagamento a herda. */
  fonteRecursoTipo: number | null;
  apelido: string | null;
  observacao: string | null;
  ativo: boolean;
}

export interface ContaBancariaPayload {
  banco: number;
  agencia: string;
  conta: string;
  contaTipo?: number | null;
  fonteRecursoTipo: number;
  apelido?: string | null;
  observacao?: string | null;
}

/**
 * Como a conta se apresenta numa linha só.
 *
 * O apelido vem primeiro quando existe: é o que se lê de relance. O número vem
 * sempre, porque é ele que se confere contra o extrato — apelido nenhum
 * substitui isso na hora de decidir se a conta é a certa.
 */
export function rotuloConta(c: ContaBancaria, nomeDoBanco: (codigo: number) => string): string {
  const numero = `${nomeDoBanco(c.banco)} · ag. ${c.agencia} · c/ ${c.conta}`;
  return c.apelido ? `${c.apelido} (${numero})` : numero;
}

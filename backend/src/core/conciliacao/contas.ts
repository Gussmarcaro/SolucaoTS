/**
 * A linha do extrato é de uma conta **deste ajuste**?
 *
 * A conciliação passou a acontecer dentro de uma parceria, e o extrato não tem
 * ajuste: ele tem banco, agência e conta, gravados por extenso porque o extrato
 * é do banco e existe mesmo que a conta saia do cadastro do ajuste depois.
 * Ligar as duas pontas é, portanto, comparar **números de conta** — e é aí que
 * mora o risco.
 *
 * **Comparar texto cru esconderia linhas.** O OFX traz `123655-9`, o cadastro
 * do ajuste traz `1236559`, a agência vem `0001` num lado e `1` no outro. Uma
 * comparação literal daria "não é deste ajuste" para o extrato inteiro — e a
 * tela ficaria vazia sem dizer por quê, que é exatamente o modo de falhar que
 * já aconteceu uma vez nesta tela.
 *
 * Por isso a comparação é por **dígitos**, e por isso é função pura conferida
 * por `verificar:ofx`: esconder uma linha de extrato é pior que mostrá-la a
 * mais — a conciliação existe para não deixar nada passar.
 */

export interface ContaBancariaChave {
  banco: number | null;
  agencia: string | number | null;
  conta: string | null;
}

/** Só os dígitos; nulo vira vazio. "123655-9" e "1236559" viram o mesmo. */
const digitos = (v: string | number | null | undefined): string =>
  v === null || v === undefined ? '' : String(v).replace(/\D/g, '');

/**
 * A chave de comparação de uma conta.
 *
 * O zero à esquerda some junto com o traço: agência `0001` e `1` são a mesma
 * agência em todo banco do país, e é comum o extrato trazer uma forma e o
 * cadastro a outra.
 */
export function chaveDaConta(c: ContaBancariaChave): string {
  const semZeros = (s: string) => s.replace(/^0+/, '') || '0';
  return [digitos(c.banco), semZeros(digitos(c.agencia)), semZeros(digitos(c.conta))].join('/');
}

/**
 * Decide se a linha pertence ao conjunto de contas do ajuste.
 *
 * **Sem contas declaradas, tudo pertence.** Ajuste que não declarou conta
 * bancária existe — e recortar por um conjunto vazio esconderia o extrato
 * inteiro, deixando o usuário sem conciliação e sem explicação. Mostrar demais
 * é recuperável olhando; mostrar de menos não é.
 */
export function ehDoAjuste(linha: ContaBancariaChave, contas: ContaBancariaChave[]): boolean {
  if (!contas.length) return true;
  const alvo = chaveDaConta(linha);
  return contas.some((c) => chaveDaConta(c) === alvo);
}

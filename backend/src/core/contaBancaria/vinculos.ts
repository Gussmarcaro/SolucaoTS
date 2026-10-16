import { chaveDaConta } from '@/core/conciliacao/contas';

/**
 * Quais ajustes declaram cada conta do cadastro.
 *
 * A pergunta nasceu da tela: o vínculo conta↔ajuste é declarado **do lado do
 * Ajuste** (aba "Fontes de Recursos e Contas"), e nunca no cadastro da conta —
 * um segundo caminho de escrita seria apagado em silêncio, porque salvar o
 * ajuste faz `deleteMany` nas contas e recria do formulário. O preço disso é
 * que, olhando o cadastro, não havia como saber a que parceria cada conta
 * serve. Esta função responde a isso **sem** criar o segundo caminho: ela só
 * lê.
 *
 * **A comparação é por duas chaves, e a segunda não é redundância.**
 * `AjusteContaBancaria.contaBancariaId` é o vínculo direto, mas é opcional: as
 * contas que o ajuste declarou antes do cadastro central existir têm só banco,
 * agência e número soltos. Casar só pelo id diria "nenhum ajuste" justamente
 * sobre as contas dos ajustes antigos — e a coluna nasceria mentindo.
 *
 * A segunda chave é `chaveDaConta`, a mesma da conciliação e do recorte da
 * Execução: o cadastro traz `1236559` onde o ajuste trouxe `123655-9`, e a
 * agência vem `0001` de um lado e `1` do outro.
 */
export interface VinculoDeAjuste {
  ajusteId: string;
  codigoAjuste: string;
  entidadeNome: string | null;
  /** Nulo nas linhas declaradas antes do cadastro central existir. */
  contaBancariaId: string | null;
  banco: number;
  agencia: number | string;
  conta: string;
}

export interface AjusteVinculado {
  id: string;
  codigo: string;
  entidade: string | null;
}

export interface ContaIdentificavel {
  id: string;
  banco: number;
  agencia: number | string;
  conta: string;
}

export function ajustesDaConta(
  conta: ContaIdentificavel,
  vinculos: VinculoDeAjuste[],
): AjusteVinculado[] {
  const chave = chaveDaConta(conta);
  const achados = new Map<string, AjusteVinculado>();

  for (const v of vinculos) {
    if (v.contaBancariaId !== conta.id && chaveDaConta(v) !== chave) continue;
    // Por ajuste, não por linha: o mesmo ajuste pode declarar a conta corrente
    // e a aplicação da mesma conta, e o código apareceria repetido na coluna.
    if (!achados.has(v.ajusteId))
      achados.set(v.ajusteId, {
        id: v.ajusteId,
        codigo: v.codigoAjuste,
        entidade: v.entidadeNome,
      });
  }

  return [...achados.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'));
}

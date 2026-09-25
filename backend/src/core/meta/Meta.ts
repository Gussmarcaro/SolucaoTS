/**
 * O vocabulário do Plano de Metas — os três tipos, as sete periodicidades e os
 * qualificadores, com os rótulos que a tela do TCESP usa.
 *
 * **Por que catálogo e não enum solto.** O cadastro do ajuste é feito na tela
 * do Tribunal e a prestação é transmitida por nós: a aferição precisa casar com
 * o que foi cadastrado lá em *código, nome, período e periodicidade*. Divergir
 * num rótulo é o caminho mais curto para a rejeição, e um catálogo é o que
 * permite a tela **oferecer** as opções em vez de aceitar digitação livre —
 * a mesma decisão das tabelas de domínio da Fase V.
 */

import type { PeriodicidadeMeta } from './periodos';
import { periodosNoAno } from './periodos';

export type { PeriodicidadeMeta };

/**
 * Os três tipos de meta.
 *
 * Não é rótulo: o tipo **decide quais campos existem**. A qualitativa não
 * quantificável não tem unidade de medida nem detalhamento por período — na
 * tela do Tribunal essas opções nem aparecem —, e é por isso que o tipo é
 * validado no servidor em vez de ficar a cargo do formulário.
 */
export type TipoMeta =
  | 'QUANTITATIVA'
  | 'QUALITATIVA_QUANTIFICAVEL'
  | 'QUALITATIVA_NAO_QUANTIFICAVEL';

/**
 * O qualificador da quantidade prevista — os **sete** do cadastro do AUDESP.
 *
 * Ele muda a leitura do atingimento, e é por isso que não é enfeite: `> 4
 * reuniões` com 5 realizadas é meta **cumprida**; `= 4` com 5 é divergência a
 * justificar. Ler os dois do mesmo jeito pediria justificativa de quem fez mais
 * que o pactuado, ou daria por cumprida uma meta que não foi.
 *
 * **Os dois últimos são de outra natureza.** `REDUZIR_EM` e `AUMENTAR_EM` não
 * comparam com um patamar: descrevem uma **variação** em relação a um ponto de
 * partida — a taxa do exercício anterior, o índice de referência do programa.
 * Esse ponto de partida não existe em lugar nenhum do nosso modelo, e por isso
 * o sistema **não afirma** se foram atingidos (ver `avaliarMeta`).
 */
export type QualificadorMeta =
  | 'IGUAL_A'
  | 'MAIOR_QUE'
  | 'MAIOR_OU_IGUAL_A'
  | 'MENOR_QUE'
  | 'MENOR_OU_IGUAL_A'
  | 'REDUZIR_EM'
  | 'AUMENTAR_EM';

export const TIPOS_META: { id: TipoMeta; rotulo: string; ajuda: string }[] = [
  {
    id: 'QUANTITATIVA',
    rotulo: 'Quantitativa',
    ajuda: 'Conta-se: atendimentos, consultas, cestas entregues.',
  },
  {
    id: 'QUALITATIVA_QUANTIFICAVEL',
    rotulo: 'Qualitativa quantificável',
    ajuda: 'Qualidade que tem medida — relatórios entregues, reuniões realizadas.',
  },
  {
    id: 'QUALITATIVA_NAO_QUANTIFICAVEL',
    rotulo: 'Qualitativa não quantificável',
    ajuda: 'Só se afere como cumprida ou não. Sem unidade e sem períodos.',
  },
];

export const PERIODICIDADES_META: { id: PeriodicidadeMeta; rotulo: string; periodos: number }[] = [
  { id: 'MENSAL', rotulo: 'Mensal', periodos: periodosNoAno('MENSAL') },
  { id: 'BIMESTRAL', rotulo: 'Bimestral', periodos: periodosNoAno('BIMESTRAL') },
  { id: 'TRIMESTRAL', rotulo: 'Trimestral', periodos: periodosNoAno('TRIMESTRAL') },
  { id: 'QUADRIMESTRAL', rotulo: 'Quadrimestral', periodos: periodosNoAno('QUADRIMESTRAL') },
  { id: 'SEMESTRAL', rotulo: 'Semestral', periodos: periodosNoAno('SEMESTRAL') },
  { id: 'EXERCICIO', rotulo: 'No exercício', periodos: periodosNoAno('EXERCICIO') },
  { id: 'UNICA', rotulo: 'Única', periodos: 1 },
];

/**
 * `relativo` separa os dois grupos, e a distinção carrega peso: nos relativos a
 * quantidade é um **delta**, não um alvo, e nenhuma comparação com o realizado
 * responde se a meta foi cumprida.
 */
export const QUALIFICADORES_META: {
  id: QualificadorMeta;
  rotulo: string;
  simbolo: string;
  relativo: boolean;
}[] = [
  { id: 'IGUAL_A', rotulo: 'Igual a', simbolo: '=', relativo: false },
  { id: 'MAIOR_QUE', rotulo: 'Maior que', simbolo: '>', relativo: false },
  { id: 'MAIOR_OU_IGUAL_A', rotulo: 'Maior ou igual a', simbolo: '≥', relativo: false },
  { id: 'MENOR_QUE', rotulo: 'Menor que', simbolo: '<', relativo: false },
  { id: 'MENOR_OU_IGUAL_A', rotulo: 'Menor ou igual a', simbolo: '≤', relativo: false },
  { id: 'REDUZIR_EM', rotulo: 'Reduzir em', simbolo: '↓', relativo: true },
  { id: 'AUMENTAR_EM', rotulo: 'Aumentar em', simbolo: '↑', relativo: true },
];

export const ehRelativo = (q: QualificadorMeta): boolean =>
  QUALIFICADORES_META.find((x) => x.id === q)?.relativo ?? false;

export const rotuloQualificador = (q: QualificadorMeta): string =>
  QUALIFICADORES_META.find((x) => x.id === q)?.rotulo ?? q;

export const simboloQualificador = (q: QualificadorMeta): string =>
  QUALIFICADORES_META.find((x) => x.id === q)?.simbolo ?? '=';

/** Tolerância de um centavo — a quantidade é `Decimal(15,2)`. */
const EPS = 0.005;

export interface AvaliacaoMeta {
  /**
   * `true` cumprida, `false` não cumprida, **`null` indeterminado**.
   *
   * O nulo não é ausência de resposta por preguiça: é a resposta certa para
   * `REDUZIR_EM`/`AUMENTAR_EM`. Chutar um veredito ali pintaria de verde uma
   * meta que ninguém conferiu — e um painel que afirma o que não sabe é pior
   * que um que se cala.
   */
  atingiu: boolean | null;
  /** Quanto falta (positivo) ou quanto excedeu (negativo). Zero nos relativos. */
  diferenca: number;
  /** `realizado ÷ previsto × 100`. Nulo quando não faz sentido. */
  percentual: number | null;
}

/**
 * Compara o realizado com o pactuado, **segundo o qualificador**.
 *
 * Erra em silêncio: um verde no lugar errado não quebra tela nenhuma, e a
 * Comissão de Fiscalização assina confiando nele. Daí ser função pura, coberta
 * por `verificar:metas` e espelhada no front.
 */
export function avaliarMeta(
  qualificador: QualificadorMeta,
  prevista: number,
  realizado: number | null,
): AvaliacaoMeta {
  if (realizado === null || !Number.isFinite(realizado))
    return { atingiu: null, diferenca: 0, percentual: null };

  const percentual = prevista > 0 ? (realizado / prevista) * 100 : null;

  if (ehRelativo(qualificador))
    // Sem o ponto de partida, a conta não existe — nem o percentual, que
    // compararia o realizado com um delta.
    return { atingiu: null, diferenca: 0, percentual: null };

  const atingiu = {
    IGUAL_A: Math.abs(realizado - prevista) < EPS,
    MAIOR_QUE: realizado > prevista + EPS,
    MAIOR_OU_IGUAL_A: realizado >= prevista - EPS,
    MENOR_QUE: realizado < prevista - EPS,
    MENOR_OU_IGUAL_A: realizado <= prevista + EPS,
    REDUZIR_EM: false,
    AUMENTAR_EM: false,
  }[qualificador];

  return { atingiu, diferenca: prevista - realizado, percentual };
}

export const TIPOS_META_IDS = TIPOS_META.map((t) => t.id);
export const PERIODICIDADES_META_IDS = PERIODICIDADES_META.map((p) => p.id);
export const QUALIFICADORES_META_IDS = QUALIFICADORES_META.map((q) => q.id);

/**
 * A leitura de `tipo` que substituiu a coluna `quantificavel`.
 *
 * Era uma coluna, e duas fontes para o mesmo fato divergem: dava para gravar
 * `tipo = QUALITATIVA_NAO_QUANTIFICAVEL` com `quantificavel = true`, e ninguém
 * notava até a aferição pedir um número que a meta não tem.
 */
export const ehQuantificavel = (tipo: TipoMeta): boolean =>
  tipo !== 'QUALITATIVA_NAO_QUANTIFICAVEL';

/**
 * Se a meta tem quadro de quantidades por período.
 *
 * Hoje é a mesma pergunta de `ehQuantificavel`, e são duas funções de propósito:
 * elas respondem a coisas diferentes (*tem número* × *tem quadro*) e nada
 * garante que continuem coincidindo. Uma meta que só se afere no fim da
 * vigência seria quantificável sem ter períodos.
 */
export const temDetalhePeriodico = (tipo: TipoMeta): boolean => ehQuantificavel(tipo);

export const rotuloTipo = (t: TipoMeta): string =>
  TIPOS_META.find((x) => x.id === t)?.rotulo ?? t;

export const rotuloPeriodicidade = (p: PeriodicidadeMeta): string =>
  PERIODICIDADES_META.find((x) => x.id === p)?.rotulo ?? p;

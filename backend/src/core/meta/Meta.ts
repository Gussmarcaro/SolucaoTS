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
 * O qualificador da quantidade prevista.
 *
 * `IGUAL_A` é "realizar exatamente isto"; `MAIOR_QUE` é piso — "no mínimo
 * 4 reuniões". A diferença muda a leitura do atingimento: 5 de 4 é meta
 * cumprida no segundo caso e divergente no primeiro.
 *
 * A lista é curta porque o manual só exibe estes dois. Acrescentar um terceiro
 * (`MENOR_QUE`, para meta de redução — evasão, reinternação) custa uma entrada
 * aqui e um valor no enum: **este bloco não é transmitido**, então nenhum
 * schema do TCESP precisa aceitá-lo.
 */
export type QualificadorMeta = 'IGUAL_A' | 'MAIOR_QUE';

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

export const QUALIFICADORES_META: { id: QualificadorMeta; rotulo: string; simbolo: string }[] = [
  { id: 'IGUAL_A', rotulo: 'Igual a', simbolo: '=' },
  { id: 'MAIOR_QUE', rotulo: 'Maior que', simbolo: '>' },
];

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

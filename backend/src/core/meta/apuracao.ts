import { avaliarMeta, type QualificadorMeta } from './Meta';

/**
 * Quantas metas foram atingidas, e quantas não.
 *
 * **Por que isto deixou de ser informação e virou número financeiro.** O TCESP
 * define o bloco *Desconto* como "a dedução aplicada ao valor de repasse em
 * razão do descumprimento parcial ou integral de metas estabelecidas no plano
 * de trabalho". Ou seja: meta não atingida não é só fato da execução — é a
 * origem de um bloco que nós transmitimos. E os ajustes costumam fixar faixas
 * ("até 10% de metas não atingidas, comunicação sem penalidade; de 10% a 20%,
 * desconto de 10% da parcela"), de modo que **o percentual é o que decide a
 * consequência**.
 *
 * A apuração é **por período**, e não por meta: é assim que a meta é pactuada.
 * "250 consultas por mês" são doze julgamentos independentes, e a entidade que
 * falhou em março não deixa de ter cumprido abril. Uma meta mensal pesa doze
 * na conta; uma quadrimestral, três.
 *
 * Função pura, coberta sem banco — o percentual daqui pode virar desconto em
 * dinheiro, e errá-lo é caro nos dois sentidos.
 */

/** O previsto de um período, vindo do Plano de Metas do ajuste. */
export interface PrevistoDoPeriodo {
  nomePrograma: string;
  codigoMeta: string;
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: number;
}

/** Uma aferição do Relatório de Atividades. */
export interface AfericaoParaApurar {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  quantidadeRealizada: number | null;
  resultadoMeta: 'CUMPRIDA' | 'NAO_CUMPRIDA' | 'CUMPRIDA_PARCIALMENTE' | null;
  /** O que o usuário respondeu no formulário; `null` quando não respondeu. */
  metaAtendida: boolean | null;
  justificativa: string | null;
}

export type SituacaoAfericao = 'ATINGIDA' | 'NAO_ATINGIDA' | 'INDETERMINADA';

export interface LinhaApuracao {
  nomePrograma: string;
  codigoMeta: string;
  periodo: number;
  situacao: SituacaoAfericao;
  /** `true` quando não atingida e sem nenhuma justificativa escrita. */
  semJustificativa: boolean;
  /**
   * O usuário marcou "meta atendida" e a conta diz o contrário.
   *
   * Não é erro — pode haver explicação, e é para isso que serve a
   * justificativa. Mas é exatamente o ponto que a fiscalização questiona, e
   * ninguém o veria sem apontar.
   */
  divergente: boolean;
}

export interface ApuracaoMetas {
  /** Aferições lançadas no relatório. */
  aferidas: number;
  atingidas: number;
  naoAtingidas: number;
  /** Sem previsto cadastrado, ou sem resposta — não entram no percentual. */
  indeterminadas: number;
  naoAtingidasSemJustificativa: number;
  divergentes: number;
  /**
   * `naoAtingidas ÷ (atingidas + naoAtingidas) × 100`.
   *
   * O denominador exclui as indeterminadas de propósito: meta sem previsto
   * cadastrado não foi cumprida nem descumprida, e jogá-la para qualquer um
   * dos lados mexeria no número que decide o desconto.
   */
  percentualNaoAtingido: number;
  linhas: LinhaApuracao[];
}

const chave = (programa: string, meta: string, periodo: number) =>
  `${programa.trim().toLowerCase()}\u0000${meta.trim().toLowerCase()}\u0000${periodo}`;

export function apurarMetas(
  afericoes: AfericaoParaApurar[],
  previstos: PrevistoDoPeriodo[],
  exercicio: number,
): ApuracaoMetas {
  /*
   * O previsto é indexado por programa+meta+período, e só do exercício da
   * prestação: a aferição guarda o número do período sem o ano, e uma meta que
   * atravessa dois exercícios tem um "1º quadrimestre" em cada.
   *
   * A chave normaliza caixa e espaços porque o vínculo entre a aferição e a
   * meta é por **texto** — e é justamente aí que o TCESP acumula "milhares de
   * erros": acento faltando, zero à esquerda, espaço sobrando.
   */
  const previsto = new Map<string, PrevistoDoPeriodo>();
  for (const p of previstos)
    if (p.ano === exercicio) previsto.set(chave(p.nomePrograma, p.codigoMeta, p.periodo), p);

  const linhas: LinhaApuracao[] = afericoes.map((a) => {
    const situacao = situacaoDe(a, previsto.get(chave(a.nomePrograma, a.codigoMeta, a.periodo)));
    const temJustificativa = !!a.justificativa?.trim();

    return {
      nomePrograma: a.nomePrograma,
      codigoMeta: a.codigoMeta,
      periodo: a.periodo,
      situacao,
      semJustificativa: situacao === 'NAO_ATINGIDA' && !temJustificativa,
      divergente: situacao === 'NAO_ATINGIDA' && a.metaAtendida === true,
    };
  });

  const atingidas = linhas.filter((l) => l.situacao === 'ATINGIDA').length;
  const naoAtingidas = linhas.filter((l) => l.situacao === 'NAO_ATINGIDA').length;
  const comVeredito = atingidas + naoAtingidas;

  return {
    aferidas: linhas.length,
    atingidas,
    naoAtingidas,
    indeterminadas: linhas.filter((l) => l.situacao === 'INDETERMINADA').length,
    naoAtingidasSemJustificativa: linhas.filter((l) => l.semJustificativa).length,
    divergentes: linhas.filter((l) => l.divergente).length,
    percentualNaoAtingido:
      comVeredito === 0 ? 0 : Math.round((naoAtingidas / comVeredito) * 10000) / 100,
    linhas,
  };
}

/**
 * A situação de uma aferição.
 *
 * Três caminhos, em ordem de precedência:
 *
 * 1. **O usuário disse que não foi atendida.** O julgamento humano vence a
 *    aritmética — quem preencheu sabe de coisa que o número não mostra.
 * 2. **Meta qualitativa**: o resultado já é a resposta. `CUMPRIDA_PARCIALMENTE`
 *    conta como **não atingida**, e não como meio-termo: a definição do TCESP
 *    fala em "descumprimento **parcial** ou integral", então o parcial é
 *    exatamente um dos casos que geram desconto.
 * 3. **Meta quantificável**: compara com o previsto daquele período, pelo
 *    qualificador. Sem previsto cadastrado não há o que comparar —
 *    indeterminada, e fora do percentual.
 */
function situacaoDe(
  a: AfericaoParaApurar,
  previsto: PrevistoDoPeriodo | undefined,
): SituacaoAfericao {
  if (a.metaAtendida === false) return 'NAO_ATINGIDA';

  if (a.resultadoMeta) return a.resultadoMeta === 'CUMPRIDA' ? 'ATINGIDA' : 'NAO_ATINGIDA';

  if (a.quantidadeRealizada === null || !previsto) return 'INDETERMINADA';

  const { atingiu } = avaliarMeta(previsto.qualificador, previsto.quantidade, a.quantidadeRealizada);
  // `null` é o caso de "reduzir em"/"aumentar em": sem o ponto de partida, o
  // sistema não afirma — e um chute aqui viraria desconto indevido.
  return atingiu === null ? 'INDETERMINADA' : atingiu ? 'ATINGIDA' : 'NAO_ATINGIDA';
}

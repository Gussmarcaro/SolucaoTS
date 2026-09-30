/**
 * Sessão de acesso — a regra que decide o que aconteceu com cada logon.
 *
 * ## O problema que esta função existe para resolver
 *
 * A especificação de um controle de acesso costuma ser escrita com a cabeça de
 * aplicação **desktop**: "fechou o sistema", "encerrou o processo", "caiu a
 * energia". Aqui é uma aplicação web com JWT **stateless**, e nenhum desses
 * casos chega ao servidor — **nem o fechamento normal da aba**.
 *
 * Se a situação dependesse só de logon e logout explícito, "encerrada
 * inesperadamente" não seria a exceção: seria a maioria esmagadora dos
 * registros, inclusive os de quem trabalhou o dia inteiro e só fechou o
 * navegador. A tela nasceria mentindo.
 *
 * Por isso há um **terceiro sinal**: `ultimaAtividadeEm`, carimbado pelo
 * middleware de autenticação, que vê toda requisição. Ele é o que permite dizer
 * até quando a pessoa esteve de fato no sistema.
 *
 * ## Derivada, nunca gravada
 *
 * Nada aqui vira coluna. Um `status = 'ABERTA'` gravado fica errado no instante
 * em que a pessoa fecha o navegador, e consertá-lo exigiria uma varredura
 * noturna — que gravaria uma hora de logout que ninguém viveu. É a mesma
 * decisão do sino ("notificação armazenada nasce desatualizada") e do rateio
 * (percentual recalculado das bases).
 *
 * Puro e sem dependência: coberto por `npm run verificar:sessoes`, sem banco.
 */

/**
 * Silêncio, em minutos, a partir do qual a sessão deixa de ser considerada
 * aberta.
 *
 * É o número que decide quem aparece como "online". Curto demais marca como
 * abandonada a sessão de quem foi almoçar; longo demais mostra como conectado
 * quem saiu há horas.
 */
export const JANELA_ABANDONO_MIN = 15;

export type SituacaoSessao = 'ABERTA' | 'ENCERRADA' | 'ENCERRADA_INESPERADAMENTE';

/** Os quatro instantes de que a leitura depende. */
export interface InstantesSessao {
  logonEm: Date;
  /** Preenchido só no logout explícito. */
  logoutEm: Date | null;
  ultimaAtividadeEm: Date;
  /** Expiração do token emitido naquele login — o teto da sessão. */
  expiraEm: Date;
}

export const SITUACAO_LABEL: Record<SituacaoSessao, string> = {
  ABERTA: 'Aberta',
  ENCERRADA: 'Encerrada',
  ENCERRADA_INESPERADAMENTE: 'Encerrada inesperadamente',
};

const MIN = 60_000;

/**
 * O que aconteceu com esta sessão.
 *
 * A ordem das perguntas é a regra:
 *
 * 1. **Houve logout explícito?** É o único sinal inequívoco, e vence tudo —
 *    inclusive um token que ainda não expirou.
 * 2. **O token já expirou?** Sessão não sobrevive ao próprio token: nenhuma
 *    requisição dela seria aceita a partir daí.
 * 3. **Está em silêncio há mais que a janela?** Ninguém encerrou, e a pessoa
 *    parou de aparecer — é o fechamento de aba, a queda de conexão, o desligar
 *    da máquina. Todos indistinguíveis daqui, e todos a mesma resposta honesta.
 * 4. Caso contrário, está **aberta**.
 */
export function situacaoDaSessao(s: InstantesSessao, agora: Date = new Date()): SituacaoSessao {
  if (s.logoutEm) return 'ENCERRADA';
  if (s.expiraEm.getTime() <= agora.getTime()) return 'ENCERRADA_INESPERADAMENTE';
  if (agora.getTime() - s.ultimaAtividadeEm.getTime() > JANELA_ABANDONO_MIN * MIN) {
    return 'ENCERRADA_INESPERADAMENTE';
  }
  return 'ABERTA';
}

/**
 * Até quando a pessoa esteve no sistema.
 *
 * **É aqui que mora o erro caro.** Na sessão encerrada inesperadamente, o fim é
 * a última atividade — nunca "agora". Quem fechou a aba às 12h01 com um token
 * de 30 dias apareceria com 29 dias de permanência na conta ingênua, e a coluna
 * inteira viraria ficção.
 */
export function fimDaSessao(s: InstantesSessao, agora: Date = new Date()): Date {
  switch (situacaoDaSessao(s, agora)) {
    case 'ENCERRADA':
      return s.logoutEm!;
    case 'ABERTA':
      return agora;
    default:
      return s.ultimaAtividadeEm;
  }
}

/**
 * Tempo de permanência, em minutos inteiros.
 *
 * Nunca negativo: relógio de cliente e de servidor podem divergir, e uma
 * permanência de -3 minutos na tela é pior que um zero.
 */
export function tempoDePermanencia(s: InstantesSessao, agora: Date = new Date()): number {
  const ms = fimDaSessao(s, agora).getTime() - s.logonEm.getTime();
  return Math.max(0, Math.floor(ms / MIN));
}

/** `95` → `"1h 35min"`. Para a coluna "Tempo" da grade. */
export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return 'menos de 1min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Uma sessão como a tela e o repositório a enxergam. */
export interface SessaoAcesso extends InstantesSessao {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  lembrar: boolean;
  ip: string | null;
  navegador: string | null;
}

/**
 * Os dois instantes de que o filtro por situação depende, num lugar só.
 *
 * A consulta precisa recortar por situação **no SQL** — filtrar em memória
 * quebraria a paginação. Isso obriga a regra a existir dos dois lados, e é
 * justamente o tipo de duplicação que diverge em silêncio. O que fica aqui é a
 * parte que erra caro: a janela e o corte. O repositório traduz a forma
 * booleana, e `verificar:sessoes` trava a leitura desta função contra a de
 * `situacaoDaSessao`, para que as duas nunca discordem sobre o mesmo instante.
 */
export function cortesDeSituacao(agora: Date = new Date()): { agora: Date; corteAtividade: Date } {
  return { agora, corteAtividade: new Date(agora.getTime() - JANELA_ABANDONO_MIN * MIN) };
}

/**
 * Histórico de acessos — o lado da tela.
 *
 * **O que NÃO está espelhado aqui é a decisão importante:** a situação da
 * sessão e o tempo de permanência vêm calculados do servidor, e não são
 * recalculados no navegador. Os dois dependem de "agora", e o relógio do
 * servidor é o único que todos os usuários compartilham — com o do navegador
 * adiantado em meia hora, uma sessão que acabou de nascer apareceria
 * abandonada, e a tela contradiria o filtro que a trouxe.
 *
 * O que fica deste lado é apresentação: rótulo, cor e o formato da duração.
 * `formatarDuracao` é o único espelho de verdade, e está travado por
 * `acesso.test.ts` com os mesmos casos de `npm run verificar:sessoes`.
 */

export type SituacaoSessao = 'ABERTA' | 'ENCERRADA' | 'ENCERRADA_INESPERADAMENTE';

export interface SessaoAcesso {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  logonEm: string;
  logoutEm: string | null;
  ultimaAtividadeEm: string;
  expiraEm: string;
  lembrar: boolean;
  ip: string | null;
  navegador: string | null;
  /** Derivada no servidor — ver o comentário do topo. */
  situacao: SituacaoSessao;
  /** Permanência em minutos, também do servidor. */
  minutos: number;
}

export const SITUACAO_LABEL: Record<SituacaoSessao, string> = {
  ABERTA: 'Aberta',
  ENCERRADA: 'Encerrada',
  ENCERRADA_INESPERADAMENTE: 'Encerrada inesperadamente',
};

/**
 * A cor diz o que se deve ler, não o que é "bom".
 *
 * Encerrada inesperadamente é o caso **comum** numa aplicação web — fechar a
 * aba não avisa o servidor —, então pinta-se de neutro. Vermelho ali ensinaria
 * a ler como incidente o que é o dia a dia, e a tela perderia a única cor que
 * precisa significar alguma coisa.
 */
export const SITUACAO_TONE: Record<SituacaoSessao, 'success' | 'neutral'> = {
  ABERTA: 'success',
  ENCERRADA: 'neutral',
  ENCERRADA_INESPERADAMENTE: 'neutral',
};

/** `95` → `"1h 35min"`. Espelho de `formatarDuracao` do backend. */
export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return 'menos de 1min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Data e hora separadas: a grade tem uma coluna para cada. */
export function dataDe(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

export function horaDe(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—';
}

/**
 * Hoje em 'YYYY-MM-DD', no fuso local.
 *
 * `toISOString()` devolveria UTC, e o botão "Hoje" clicado às 22h em São Paulo
 * filtraria o dia seguinte — que ainda não tem acesso nenhum. A tela abriria
 * vazia e pareceria quebrada.
 */
export function hojeLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

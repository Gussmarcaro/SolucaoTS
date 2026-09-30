import type { ISessaoRepository, NovaSessao } from './ISessaoRepository';
import { registrar as logar } from '@/shared/log';

/**
 * Intervalo mínimo entre duas gravações de atividade da mesma sessão.
 *
 * Sem ele, cada requisição da aplicação viraria uma escrita — e uma tela de
 * grade dispara várias por clique. Com ele, o custo é **uma** escrita por
 * minuto por sessão ativa, que é a resolução de que a tela precisa.
 */
const INTERVALO_ATIVIDADE_MS = 60_000;

/**
 * Última atividade já gravada, por sessão, **neste processo**.
 *
 * É a primeira peneira: evita até a ida ao banco. A segunda está no `where` do
 * `UPDATE`, e é ela que vale de verdade — o processo pode reiniciar, e podem
 * existir vários. Uma peneira sem a outra não serviria: só o cache erraria após
 * um reinício, só o banco custaria uma consulta por requisição.
 */
const ultimaGravacao = new Map<string, number>();

/** Teto do cache, para uma tabela em memória não crescer sem fim. */
const MAX_SESSOES_EM_CACHE = 5_000;

/**
 * Escrita do histórico de acessos.
 *
 * **Nada aqui derruba a operação de negócio.** Falhar ao abrir a sessão não
 * pode impedir alguém de entrar no sistema, e falhar ao carimbar a atividade
 * não pode fazer uma listagem devolver 500. É a mesma decisão da trilha de
 * auditoria: o registro é importante, a operação é mais.
 */
export class RegistrarAcessoUseCase {
  constructor(private readonly repo: ISessaoRepository) {}

  /**
   * Abre a sessão no login. Devolve o id para o `jti` do token — ou `null` se
   * a gravação falhou, caso em que o login segue normalmente e apenas não é
   * registrado.
   */
  async abrir(dados: NovaSessao): Promise<string | null> {
    try {
      return await this.repo.abrir(dados);
    } catch (err) {
      logar('aviso', 'sessao-abrir-falhou', {
        usuario: dados.usuarioId,
        erro: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /** Logout explícito. */
  async encerrar(sessaoId: string | null | undefined): Promise<void> {
    if (!sessaoId) return;
    try {
      ultimaGravacao.delete(sessaoId);
      await this.repo.encerrar(sessaoId);
    } catch (err) {
      logar('aviso', 'sessao-encerrar-falhou', {
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Carimba que a sessão continua viva. Chamada pelo middleware de
   * autenticação, **sem `await`**: o histórico não pode atrasar a requisição.
   */
  async tocar(sessaoId: string | null | undefined): Promise<void> {
    if (!sessaoId) return;

    const agora = Date.now();
    const anterior = ultimaGravacao.get(sessaoId);
    if (anterior && agora - anterior < INTERVALO_ATIVIDADE_MS) return;

    // Marca antes de gravar: se duas requisições chegarem juntas, só a
    // primeira tenta. Uma falha custa um minuto de atraso no carimbo, que é
    // irrelevante diante da janela de 15 minutos que decide a situação.
    ultimaGravacao.set(sessaoId, agora);
    if (ultimaGravacao.size > MAX_SESSOES_EM_CACHE) ultimaGravacao.clear();

    try {
      await this.repo.registrarAtividade(sessaoId, new Date(agora - INTERVALO_ATIVIDADE_MS));
    } catch (err) {
      logar('aviso', 'sessao-atividade-falhou', {
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

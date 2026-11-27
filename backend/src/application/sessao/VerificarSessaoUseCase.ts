import { registrar as logar } from '@/shared/log';

/**
 * O token de login é assinado e vale até expirar — 8 horas, ou 30 dias com
 * "lembrar de mim". Sozinho, ele não sabe que o usuário foi **inativado**,
 * **trocou de grupo** ou **perdeu a marca de Suporte** depois do login, nem que
 * a pessoa **saiu** do sistema. Até esta verificação, tudo isso só valia no
 * próximo login: um usuário desligado seguia entrando por semanas.
 *
 * Agora cada requisição confere o estado atual. Para não pesar no banco, a
 * resposta fica guardada por {@link VALIDADE_MS} — é esse o atraso máximo entre
 * o administrador inativar alguém e o acesso cair. O "Sair" invalida na hora,
 * porque esquece a sessão do cache ({@link VerificarSessaoUseCase.esquecer}).
 */
export const VALIDADE_MS = 30_000;
const MAX_EM_CACHE = 5_000;

export interface EstadoUsuario {
  ativo: boolean;
  /** Nome do grupo, que é o que viaja no token e o que a matriz de permissões lê. */
  grupoNome: string | null;
  suporte: boolean;
}

export interface IEstadoSessaoRepository {
  usuario(id: string): Promise<EstadoUsuario | null>;
  /** A sessão teve logout explícito. */
  sessaoEncerrada(sessaoId: string): Promise<boolean>;
}

export type MotivoRecusa = 'INATIVO' | 'ENCERRADA' | 'PERMISSOES_MUDARAM';

export interface ClaimsSessao {
  usuarioId: string;
  sessaoId: string | null;
  grupo: string | null;
  suporte: boolean;
}

export const MENSAGEM: Record<MotivoRecusa, string> = {
  INATIVO: 'Seu acesso foi desativado. Contate o administrador.',
  ENCERRADA: 'Sessão encerrada. Entre novamente.',
  PERMISSOES_MUDARAM: 'Suas permissões foram alteradas. Entre novamente para continuar.',
};

export class VerificarSessaoUseCase {
  private readonly cache = new Map<string, { motivo: MotivoRecusa | null; ate: number }>();

  constructor(
    private readonly repo: IEstadoSessaoRepository,
    private readonly agora: () => number = Date.now,
  ) {}

  /** Nulo quando a sessão segue válida; senão, o motivo da recusa. */
  async verificar(c: ClaimsSessao): Promise<MotivoRecusa | null> {
    const chave = `${c.usuarioId}|${c.sessaoId ?? ''}|${c.grupo ?? ''}|${c.suporte ? 1 : 0}`;
    const t = this.agora();
    const guardado = this.cache.get(chave);
    if (guardado && guardado.ate > t) return guardado.motivo;

    let motivo: MotivoRecusa | null;
    try {
      motivo = await this.consultar(c);
    } catch (err) {
      // Banco fora: não derruba quem está trabalhando por causa da checagem.
      // O token continua assinado e com prazo; a verificação volta sozinha.
      logar('aviso', 'sessao-verificacao-falhou', { erro: err instanceof Error ? err.message : String(err) });
      return null;
    }

    if (this.cache.size >= MAX_EM_CACHE) this.cache.clear();
    this.cache.set(chave, { motivo, ate: t + VALIDADE_MS });
    return motivo;
  }

  /** Chamado no logout: a próxima requisição com aquele token já é recusada. */
  esquecer(sessaoId: string | null | undefined): void {
    if (!sessaoId) return;
    for (const k of this.cache.keys()) if (k.split('|')[1] === sessaoId) this.cache.delete(k);
  }

  private async consultar(c: ClaimsSessao): Promise<MotivoRecusa | null> {
    const [u, encerrada] = await Promise.all([
      this.repo.usuario(c.usuarioId),
      c.sessaoId ? this.repo.sessaoEncerrada(c.sessaoId) : Promise.resolve(false),
    ]);
    if (!u || !u.ativo) return 'INATIVO';
    if (encerrada) return 'ENCERRADA';
    // Grupo trocado, ou a marca de Suporte retirada: o token carrega o poder
    // antigo, e a matriz o leria como se nada tivesse mudado.
    if ((u.grupoNome ?? null) !== (c.grupo ?? null) || (c.suporte && !u.suporte)) return 'PERMISSOES_MUDARAM';
    return null;
  }
}

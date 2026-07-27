import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type { IEmailService } from './IEmailService';
import type { SolicitarRecuperacaoDTO } from './dtos';
import { gerarResetToken } from '@/shared/auth/resetToken';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN ?? 30);

export class SolicitarRecuperacaoUseCase {
  constructor(
    private readonly repo: IUsuarioRepository,
    private readonly email: IEmailService,
  ) {}

  /**
   * Sempre resolve sem erro (resposta genérica na camada HTTP) para não
   * revelar se o e-mail existe. Só envia o e-mail se o usuário existir.
   */
  async execute({ email }: SolicitarRecuperacaoDTO): Promise<void> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    const usuario = await this.repo.buscarAuthPorEmail(emailNorm);
    if (!usuario) return;

    const { token, tokenHash, expiresAt } = gerarResetToken();
    await this.repo.definirResetToken(usuario.id, tokenHash, expiresAt);

    const link = `${APP_URL}/redefinir-senha?token=${token}`;
    await this.email.enviarRecuperacaoSenha({
      para: usuario.email,
      nome: usuario.nome,
      link,
      validadeMinutos: TTL_MIN,
    });
  }
}

import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type { RedefinirSenhaDTO } from './dtos';
import { AppError, BusinessError } from '@/shared/errors';
import { hashResetToken } from '@/shared/auth/resetToken';
import { hashSenha, isSenhaForte } from '@/shared/auth/senha';

/** Erro de token inválido/expirado (genérico). */
class TokenInvalidoError extends AppError {
  constructor() {
    super('Link de redefinição inválido ou expirado.', 400, 'RESET_TOKEN_INVALIDO');
  }
}

export class RedefinirSenhaUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute({ token, senha, confirmarSenha }: RedefinirSenhaDTO): Promise<void> {
    if (!token) throw new TokenInvalidoError();
    if (senha !== confirmarSenha) throw new BusinessError('As senhas não conferem.');
    if (!isSenhaForte(senha))
      throw new BusinessError(
        'Senha fraca: use no mínimo 8 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.',
      );

    const tokenHash = hashResetToken(token);
    const registro = await this.repo.buscarPorResetTokenHash(tokenHash);

    // Token inexistente ou expirado → mesmo erro genérico.
    if (!registro || !registro.resetTokenExpiresAt || registro.resetTokenExpiresAt < new Date()) {
      throw new TokenInvalidoError();
    }

    const senhaHash = await hashSenha(senha);
    await this.repo.atualizarSenhaELimparReset(registro.id, senhaHash);
  }
}

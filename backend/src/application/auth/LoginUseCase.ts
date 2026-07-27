import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type { LoginDTO, LoginResultado } from './dtos';
import { AppError } from '@/shared/errors';
import { compararSenha } from '@/shared/auth/senha';
import { assinarToken } from '@/shared/auth/jwt';

// Hash bcrypt "descartável" usado para igualar o tempo de resposta quando o
// e-mail não existe (mitiga ataques de timing / enumeração de usuários).
const HASH_DUMMY = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3f9m8f8m8f8m8f8m8f8m8f8m8f8m8f8';

/** Erro genérico de credenciais — nunca revela se o e-mail existe. */
class CredenciaisInvalidasError extends AppError {
  constructor() {
    super('E-mail ou senha inválidos.', 401, 'CREDENCIAIS_INVALIDAS');
  }
}

export class LoginUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute({ email, senha, lembrar }: LoginDTO): Promise<LoginResultado> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    const usuario = await this.repo.buscarAuthPorEmail(emailNorm);

    // Compara sempre (mesmo sem usuário) para não vazar existência por timing.
    const hash = usuario?.senhaHash ?? HASH_DUMMY;
    const senhaOk = await compararSenha(senha ?? '', hash);

    if (!usuario || !usuario.senhaHash || !senhaOk) {
      throw new CredenciaisInvalidasError();
    }
    if (!usuario.ativo) {
      throw new AppError('Usuário inativo. Contate o administrador.', 403, 'USUARIO_INATIVO');
    }

    const token = assinarToken(
      { sub: usuario.id, nome: usuario.nome, email: usuario.email },
      !!lembrar,
    );

    return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } };
  }
}

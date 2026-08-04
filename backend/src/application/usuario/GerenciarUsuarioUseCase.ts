import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais de Usuário: (in)ativação (soft delete). */
export class GerenciarUsuarioUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async definirAtivo(id: string, ativo: boolean): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');
    return this.repo.definirAtivo(id, ativo);
  }
}

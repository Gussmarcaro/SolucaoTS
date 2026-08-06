import type { Grupo, GrupoResumo } from '@/core/grupo/Grupo';
import type { IGrupoRepository } from './IGrupoRepository';
import { BusinessError, NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar, (in)ativar, excluir (com trava) e listar ativos. */
export class GerenciarGrupoUseCase {
  constructor(private readonly repo: IGrupoRepository) {}

  async buscar(id: string): Promise<Grupo> {
    const grupo = await this.repo.buscarPorId(id);
    if (!grupo) throw new NotFoundError('Grupo não encontrado.');
    return grupo;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Grupo> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }

  async excluir(id: string): Promise<void> {
    await this.buscar(id);
    const membros = await this.repo.contarMembros(id);
    if (membros > 0)
      throw new BusinessError(
        `Não é possível excluir: o grupo possui ${membros} usuário(s) vinculado(s).`,
      );
    await this.repo.excluir(id);
  }

  async listarAtivos(): Promise<GrupoResumo[]> {
    return this.repo.listarAtivos();
  }
}

import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarEntidadeUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async buscar(id: string): Promise<EntidadeBeneficiaria> {
    const entidade = await this.repo.buscarPorId(id);
    if (!entidade) throw new NotFoundError('Entidade não encontrada.');
    return entidade;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<EntidadeBeneficiaria> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

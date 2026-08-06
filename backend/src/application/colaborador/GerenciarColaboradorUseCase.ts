import type { Colaborador } from '@/core/colaborador/Colaborador';
import type { IColaboradorRepository } from './IColaboradorRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarColaboradorUseCase {
  constructor(private readonly repo: IColaboradorRepository) {}

  async buscar(id: string): Promise<Colaborador> {
    const colaborador = await this.repo.buscarPorId(id);
    if (!colaborador) throw new NotFoundError('Colaborador não encontrado.');
    return colaborador;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Colaborador> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

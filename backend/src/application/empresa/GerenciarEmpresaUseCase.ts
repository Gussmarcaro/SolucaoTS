import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar. */
export class GerenciarEmpresaUseCase {
  constructor(private readonly repo: IEmpresaRepository) {}

  async buscar(id: string): Promise<Empresa> {
    const empresa = await this.repo.buscarPorId(id);
    if (!empresa) throw new NotFoundError('Empresa não encontrada.');
    return empresa;
  }

  /** Soft delete / reativação. */
  async definirAtivo(id: string, ativo: boolean): Promise<Empresa> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

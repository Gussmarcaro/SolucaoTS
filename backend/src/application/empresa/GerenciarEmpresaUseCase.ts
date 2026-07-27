import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar, (in)ativar e atualizar logo. */
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

  async atualizarLogo(id: string, logoUrl: string): Promise<Empresa> {
    await this.buscar(id);
    return this.repo.atualizarLogo(id, logoUrl);
  }
}

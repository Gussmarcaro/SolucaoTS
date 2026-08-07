import type { Cliente } from '@/core/cliente/Cliente';
import type { IClienteRepository } from './IClienteRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async buscar(id: string): Promise<Cliente> {
    const cliente = await this.repo.buscarPorId(id);
    if (!cliente) throw new NotFoundError('Órgão não encontrado.');
    return cliente;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Cliente> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

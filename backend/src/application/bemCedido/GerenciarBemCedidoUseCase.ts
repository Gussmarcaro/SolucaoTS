import type { BemCedido } from '@/core/bemCedido/BemCedido';
import type { IBemCedidoRepository } from './IBemCedidoRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarBemCedidoUseCase {
  constructor(private readonly repo: IBemCedidoRepository) {}

  async buscar(id: string): Promise<BemCedido> {
    const bem = await this.repo.buscarPorId(id);
    if (!bem) throw new NotFoundError('Bem cedido não encontrado.');
    return bem;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<BemCedido> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

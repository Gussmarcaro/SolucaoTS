import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import type { IServidorCedidoRepository } from './IServidorCedidoRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarServidorCedidoUseCase {
  constructor(private readonly repo: IServidorCedidoRepository) {}

  async buscar(id: string): Promise<ServidorCedido> {
    const servidor = await this.repo.buscarPorId(id);
    if (!servidor) throw new NotFoundError('Servidor cedido não encontrado.');
    return servidor;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<ServidorCedido> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

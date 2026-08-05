import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import type { IFornecedorRepository } from './IFornecedorRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarFornecedorUseCase {
  constructor(private readonly repo: IFornecedorRepository) {}

  async buscar(id: string): Promise<Fornecedor> {
    const fornecedor = await this.repo.buscarPorId(id);
    if (!fornecedor) throw new NotFoundError('Fornecedor não encontrado.');
    return fornecedor;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Fornecedor> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

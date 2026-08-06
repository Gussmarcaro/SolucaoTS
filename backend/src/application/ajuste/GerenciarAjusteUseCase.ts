import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import { NotFoundError } from '@/shared/errors';

/** Caso de uso pontual: buscar um ajuste por id. */
export class GerenciarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async buscar(id: string): Promise<Ajuste> {
    const ajuste = await this.repo.buscarPorId(id);
    if (!ajuste) throw new NotFoundError('Ajuste não encontrado.');
    return ajuste;
  }
}

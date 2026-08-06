import type { Contrato } from '@/core/contrato/Contrato';
import type { IContratoRepository } from './IContratoRepository';
import { NotFoundError } from '@/shared/errors';

/** Casos de uso pontuais: buscar e (in)ativar (soft delete). */
export class GerenciarContratoUseCase {
  constructor(private readonly repo: IContratoRepository) {}

  async buscar(id: string): Promise<Contrato> {
    const contrato = await this.repo.buscarPorId(id);
    if (!contrato) throw new NotFoundError('Contrato não encontrado.');
    return contrato;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Contrato> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }
}

import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import type { AtualizarEntidadeDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarEntidade } from './validarEntidade';

export class AtualizarEntidadeUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async execute(id: string, input: AtualizarEntidadeDTO): Promise<EntidadeBeneficiaria> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Entidade não encontrada.');

    const dados = normalizarEValidarEntidade(input);

    const comMesmoCnpj = await this.repo.buscarPorCnpj(dados.cnpj);
    if (comMesmoCnpj && comMesmoCnpj.id !== id) {
      throw new ConflictError(
        'Esta entidade (CNPJ) já está cadastrada no sistema.',
        'CNPJ_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

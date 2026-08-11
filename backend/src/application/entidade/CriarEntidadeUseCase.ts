import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import type { CriarEntidadeDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarEntidade } from './validarEntidade';

export class CriarEntidadeUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async execute(input: CriarEntidadeDTO): Promise<EntidadeBeneficiaria> {
    const dados = normalizarEValidarEntidade(input);

    const existente = await this.repo.buscarPorCnpj(dados.cnpj);
    if (existente) {
      throw new ConflictError(
        'Esta entidade (CNPJ) já está cadastrada no sistema.',
        'CNPJ_DUPLICADO',
      );
    }

    // Cadastro inicial não é alteração — a data só é carimbada quando o
    // estatuto muda depois.
    return this.repo.criar({ ...dados, estatutoDataAlteracao: null });
  }
}

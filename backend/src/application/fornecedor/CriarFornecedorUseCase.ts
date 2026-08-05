import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import type { IFornecedorRepository } from './IFornecedorRepository';
import type { CriarFornecedorDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarFornecedor } from './validarFornecedor';

export class CriarFornecedorUseCase {
  constructor(private readonly repo: IFornecedorRepository) {}

  async execute(input: CriarFornecedorDTO): Promise<Fornecedor> {
    const dados = normalizarEValidarFornecedor(input);

    const existente = await this.repo.buscarPorDocumento(dados.documento);
    if (existente) {
      throw new ConflictError(
        'Este CPF/CNPJ já está cadastrado como fornecedor.',
        'DOCUMENTO_DUPLICADO',
      );
    }

    return this.repo.criar(dados);
  }
}

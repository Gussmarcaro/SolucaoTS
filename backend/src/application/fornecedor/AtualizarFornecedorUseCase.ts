import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import type { IFornecedorRepository } from './IFornecedorRepository';
import type { AtualizarFornecedorDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarFornecedor } from './validarFornecedor';

export class AtualizarFornecedorUseCase {
  constructor(private readonly repo: IFornecedorRepository) {}

  async execute(id: string, input: AtualizarFornecedorDTO): Promise<Fornecedor> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Fornecedor não encontrado.');

    const dados = normalizarEValidarFornecedor(input);

    const comMesmoDoc = await this.repo.buscarPorDocumento(dados.documento);
    if (comMesmoDoc && comMesmoDoc.id !== id) {
      throw new ConflictError(
        'Este CPF/CNPJ já está cadastrado como fornecedor.',
        'DOCUMENTO_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

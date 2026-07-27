import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import type { AtualizarEmpresaDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarEmpresa } from './validarEmpresa';

export class AtualizarEmpresaUseCase {
  constructor(private readonly repo: IEmpresaRepository) {}

  async execute(id: string, input: AtualizarEmpresaDTO): Promise<Empresa> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Empresa não encontrada.');

    const dados = normalizarEValidarEmpresa(input);

    // Trava de duplicidade: outro registro com o mesmo CNPJ.
    const comMesmoCnpj = await this.repo.buscarPorCnpj(dados.cnpj);
    if (comMesmoCnpj && comMesmoCnpj.id !== id) {
      throw new ConflictError(
        'Esta empresa (CNPJ) já está cadastrada no sistema.',
        'CNPJ_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

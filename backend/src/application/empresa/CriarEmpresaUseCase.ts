import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import type { CriarEmpresaDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarEmpresa } from './validarEmpresa';

export class CriarEmpresaUseCase {
  constructor(private readonly repo: IEmpresaRepository) {}

  async execute(input: CriarEmpresaDTO): Promise<Empresa> {
    const dados = normalizarEValidarEmpresa(input);

    // Trava de duplicidade por CNPJ.
    const existente = await this.repo.buscarPorCnpj(dados.cnpj);
    if (existente) {
      throw new ConflictError(
        'Esta empresa (CNPJ) já está cadastrada no sistema.',
        'CNPJ_DUPLICADO',
      );
    }

    return this.repo.criar(dados);
  }
}

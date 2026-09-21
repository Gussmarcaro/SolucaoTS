import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { CriarAjusteDTO } from './dtos';
import { BusinessError, ConflictError } from '@/shared/errors';
import { normalizarEValidarAjuste } from './validarAjuste';

export class CriarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async execute(input: CriarAjusteDTO): Promise<Ajuste> {
    const dados = normalizarEValidarAjuste(input);

    if (!(await this.repo.entidadeExiste(dados.entidadeBeneficiariaId)))
      throw new BusinessError('Entidade beneficiária não encontrada.');

    const existente = await this.repo.buscarPorCodigo(dados.codigoAjuste);
    if (existente)
      throw new ConflictError('Já existe um ajuste com este código.', 'CODIGO_DUPLICADO');

    return this.repo.criar(dados);
  }
}

import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { AtualizarAjusteDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarAjuste } from './validarAjuste';

export class AtualizarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async execute(id: string, input: AtualizarAjusteDTO): Promise<Ajuste> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Ajuste não encontrado.');

    const dados = normalizarEValidarAjuste(input);

    if (!(await this.repo.entidadeExiste(dados.entidadeBeneficiariaId)))
      throw new BusinessError('Entidade beneficiária não encontrada.');

    if (dados.clienteId && !(await this.repo.clienteExiste(dados.clienteId)))
      throw new BusinessError('Órgão prestador não encontrado.');

    const existente = await this.repo.buscarPorCodigo(dados.codigoAjuste);
    if (existente && existente.id !== id)
      throw new ConflictError('Já existe um ajuste com este código.', 'CODIGO_DUPLICADO');

    return this.repo.atualizar(id, dados);
  }
}

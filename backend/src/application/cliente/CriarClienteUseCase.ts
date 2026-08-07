import type { Cliente } from '@/core/cliente/Cliente';
import type { IClienteRepository } from './IClienteRepository';
import type { CriarClienteDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarCliente } from './validarCliente';

export class CriarClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(input: CriarClienteDTO): Promise<Cliente> {
    const dados = normalizarEValidarCliente(input);

    if (await this.repo.buscarPorCnpj(dados.cnpj))
      throw new ConflictError('Este órgão (CNPJ) já está cadastrado no sistema.', 'CNPJ_DUPLICADO');

    if (await this.repo.buscarPorCodigos(dados.codigoMunicipio, dados.codigoEntidade))
      throw new ConflictError(
        'Já existe um órgão com este código de município/entidade.',
        'CODIGOS_DUPLICADOS',
      );

    return this.repo.criar(dados);
  }
}

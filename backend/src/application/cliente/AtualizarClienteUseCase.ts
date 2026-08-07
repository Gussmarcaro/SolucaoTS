import type { Cliente } from '@/core/cliente/Cliente';
import type { IClienteRepository } from './IClienteRepository';
import type { AtualizarClienteDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarCliente } from './validarCliente';

export class AtualizarClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(id: string, input: AtualizarClienteDTO): Promise<Cliente> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Órgão não encontrado.');

    const dados = normalizarEValidarCliente(input);

    const comMesmoCnpj = await this.repo.buscarPorCnpj(dados.cnpj);
    if (comMesmoCnpj && comMesmoCnpj.id !== id)
      throw new ConflictError('Este órgão (CNPJ) já está cadastrado no sistema.', 'CNPJ_DUPLICADO');

    const comMesmosCodigos = await this.repo.buscarPorCodigos(dados.codigoMunicipio, dados.codigoEntidade);
    if (comMesmosCodigos && comMesmosCodigos.id !== id)
      throw new ConflictError(
        'Já existe um órgão com este código de município/entidade.',
        'CODIGOS_DUPLICADOS',
      );

    return this.repo.atualizar(id, dados);
  }
}

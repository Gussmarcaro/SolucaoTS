import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import type { IServidorCedidoRepository } from './IServidorCedidoRepository';
import type { CriarServidorCedidoDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarServidorCedido } from './validarServidorCedido';

export class CriarServidorCedidoUseCase {
  constructor(private readonly repo: IServidorCedidoRepository) {}

  async execute(input: CriarServidorCedidoDTO): Promise<ServidorCedido> {
    const dados = normalizarEValidarServidorCedido(input);

    const existente = await this.repo.buscarPorCpf(dados.cpf);
    if (existente) {
      throw new ConflictError(
        'Este CPF já está cadastrado como servidor cedido.',
        'CPF_DUPLICADO',
      );
    }

    return this.repo.criar(dados);
  }
}

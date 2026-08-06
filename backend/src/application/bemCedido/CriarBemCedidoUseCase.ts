import type { BemCedido } from '@/core/bemCedido/BemCedido';
import type { IBemCedidoRepository } from './IBemCedidoRepository';
import type { CriarBemCedidoDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarBemCedido } from './validarBemCedido';

export class CriarBemCedidoUseCase {
  constructor(private readonly repo: IBemCedidoRepository) {}

  async execute(input: CriarBemCedidoDTO): Promise<BemCedido> {
    const dados = normalizarEValidarBemCedido(input);

    const existente = await this.repo.buscarPorIdentificador(dados.identificador);
    if (existente) {
      throw new ConflictError(
        'Já existe um bem cadastrado com este identificador.',
        'IDENTIFICADOR_DUPLICADO',
      );
    }

    return this.repo.criar(dados);
  }
}

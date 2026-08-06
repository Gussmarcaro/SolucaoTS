import type { BemCedido } from '@/core/bemCedido/BemCedido';
import type { IBemCedidoRepository } from './IBemCedidoRepository';
import type { AtualizarBemCedidoDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarBemCedido } from './validarBemCedido';

export class AtualizarBemCedidoUseCase {
  constructor(private readonly repo: IBemCedidoRepository) {}

  async execute(id: string, input: AtualizarBemCedidoDTO): Promise<BemCedido> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Bem cedido não encontrado.');

    const dados = normalizarEValidarBemCedido(input);

    const existente = await this.repo.buscarPorIdentificador(dados.identificador);
    if (existente && existente.id !== id) {
      throw new ConflictError(
        'Já existe um bem cadastrado com este identificador.',
        'IDENTIFICADOR_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import type { IServidorCedidoRepository } from './IServidorCedidoRepository';
import type { AtualizarServidorCedidoDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarServidorCedido } from './validarServidorCedido';

export class AtualizarServidorCedidoUseCase {
  constructor(private readonly repo: IServidorCedidoRepository) {}

  async execute(id: string, input: AtualizarServidorCedidoDTO): Promise<ServidorCedido> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Servidor cedido não encontrado.');

    const dados = normalizarEValidarServidorCedido(input);

    const comMesmoCpf = await this.repo.buscarPorCpf(dados.cpf);
    if (comMesmoCpf && comMesmoCpf.id !== id) {
      throw new ConflictError(
        'Este CPF já está cadastrado como servidor cedido.',
        'CPF_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

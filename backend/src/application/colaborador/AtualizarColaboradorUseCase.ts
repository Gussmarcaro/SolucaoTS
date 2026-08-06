import type { Colaborador } from '@/core/colaborador/Colaborador';
import type { IColaboradorRepository } from './IColaboradorRepository';
import type { AtualizarColaboradorDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarColaborador } from './validarColaborador';

export class AtualizarColaboradorUseCase {
  constructor(private readonly repo: IColaboradorRepository) {}

  async execute(id: string, input: AtualizarColaboradorDTO): Promise<Colaborador> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Colaborador não encontrado.');

    const dados = normalizarEValidarColaborador(input);

    const comMesmoCpf = await this.repo.buscarPorCpf(dados.cpf);
    if (comMesmoCpf && comMesmoCpf.id !== id) {
      throw new ConflictError('Este CPF já está cadastrado como colaborador.', 'CPF_DUPLICADO');
    }

    return this.repo.atualizar(id, dados);
  }
}

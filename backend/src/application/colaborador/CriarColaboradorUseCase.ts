import type { Colaborador } from '@/core/colaborador/Colaborador';
import type { IColaboradorRepository } from './IColaboradorRepository';
import type { CriarColaboradorDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarColaborador } from './validarColaborador';

export class CriarColaboradorUseCase {
  constructor(private readonly repo: IColaboradorRepository) {}

  async execute(input: CriarColaboradorDTO): Promise<Colaborador> {
    const dados = normalizarEValidarColaborador(input);

    const existente = await this.repo.buscarPorCpf(dados.cpf);
    if (existente) {
      throw new ConflictError('Este CPF já está cadastrado como colaborador.', 'CPF_DUPLICADO');
    }

    return this.repo.criar(dados);
  }
}

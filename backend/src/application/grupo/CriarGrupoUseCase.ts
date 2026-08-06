import type { Grupo } from '@/core/grupo/Grupo';
import type { IGrupoRepository } from './IGrupoRepository';
import type { CriarGrupoDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarGrupo } from './validarGrupo';

export class CriarGrupoUseCase {
  constructor(private readonly repo: IGrupoRepository) {}

  async execute(input: CriarGrupoDTO): Promise<Grupo> {
    const dados = normalizarEValidarGrupo(input);

    const existente = await this.repo.buscarPorNome(dados.nome);
    if (existente) throw new ConflictError('Já existe um grupo com este nome.', 'GRUPO_DUPLICADO');

    return this.repo.criar(dados);
  }
}

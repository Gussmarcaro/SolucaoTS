import type { Grupo } from '@/core/grupo/Grupo';
import type { IGrupoRepository } from './IGrupoRepository';
import type { AtualizarGrupoDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarGrupo } from './validarGrupo';

export class AtualizarGrupoUseCase {
  constructor(private readonly repo: IGrupoRepository) {}

  async execute(id: string, input: AtualizarGrupoDTO): Promise<Grupo> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Grupo não encontrado.');

    const dados = normalizarEValidarGrupo(input);

    const comMesmoNome = await this.repo.buscarPorNome(dados.nome);
    if (comMesmoNome && comMesmoNome.id !== id)
      throw new ConflictError('Já existe um grupo com este nome.', 'GRUPO_DUPLICADO');

    return this.repo.atualizar(id, dados);
  }
}

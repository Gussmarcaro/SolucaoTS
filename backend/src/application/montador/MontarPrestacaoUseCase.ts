import type { IMontadorRepository } from './IMontadorRepository';
import type { ResultadoMontagem } from './tipos';
import { NotFoundError } from '@/shared/errors';
import { montarPrestacao } from './montarPrestacao';

export class MontarPrestacaoUseCase {
  constructor(private readonly repo: IMontadorRepository) {}

  async execute(prestacaoId: string): Promise<ResultadoMontagem> {
    const dados = await this.repo.carregar(prestacaoId);
    if (!dados) throw new NotFoundError('Prestação não encontrada.');
    return montarPrestacao(dados);
  }
}

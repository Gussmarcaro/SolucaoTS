import type { Contrato } from '@/core/contrato/Contrato';
import type { IContratoRepository } from './IContratoRepository';
import type { AtualizarContratoDTO } from './dtos';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarContrato } from './validarContrato';

export class AtualizarContratoUseCase {
  constructor(private readonly repo: IContratoRepository) {}

  async execute(id: string, input: AtualizarContratoDTO): Promise<Contrato> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Contrato não encontrado.');

    const dados = normalizarEValidarContrato(input);

    const existente = await this.repo.buscarPorNumeroCredor(dados.numero, dados.credorDocumento);
    if (existente && existente.id !== id) {
      throw new ConflictError(
        'Já existe um contrato com este número para o mesmo credor.',
        'CONTRATO_DUPLICADO',
      );
    }

    return this.repo.atualizar(id, dados);
  }
}

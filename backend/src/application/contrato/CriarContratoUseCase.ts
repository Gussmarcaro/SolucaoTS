import type { Contrato } from '@/core/contrato/Contrato';
import type { IContratoRepository } from './IContratoRepository';
import type { CriarContratoDTO } from './dtos';
import { ConflictError } from '@/shared/errors';
import { normalizarEValidarContrato } from './validarContrato';

export class CriarContratoUseCase {
  constructor(private readonly repo: IContratoRepository) {}

  async execute(input: CriarContratoDTO): Promise<Contrato> {
    const dados = normalizarEValidarContrato(input);

    const existente = await this.repo.buscarPorNumeroCredor(dados.numero, dados.credorDocumento);
    if (existente) {
      throw new ConflictError(
        'Já existe um contrato com este número para o mesmo credor.',
        'CONTRATO_DUPLICADO',
      );
    }

    return this.repo.criar(dados);
  }
}

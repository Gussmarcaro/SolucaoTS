import type { Empenho } from '@/core/empenho/Empenho';
import type { IEmpenhoRepository } from './IEmpenhoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosEmpenho, EmpenhoDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function validar(input: EmpenhoDTO): DadosEmpenho {
  const numeroEmpenho = input.numeroEmpenho?.trim() ?? '';
  if (!numeroEmpenho) throw new BusinessError('Informe o número do empenho.');
  if (numeroEmpenho.length > 35) throw new BusinessError('Número do empenho muito longo (máx. 35).');

  const anoEmpenho =
    typeof input.anoEmpenho === 'string' ? Number(input.anoEmpenho) : input.anoEmpenho;
  if (!Number.isInteger(anoEmpenho) || anoEmpenho < 1900 || anoEmpenho > 2100)
    throw new BusinessError('Ano do empenho inválido.');

  let dataEmissaoEmpenho: Date;
  try {
    dataEmissaoEmpenho = parseDataISO(input.dataEmissaoEmpenho);
  } catch {
    throw new BusinessError('Data de emissão inválida.');
  }

  return {
    numeroEmpenho,
    anoEmpenho,
    retificacao: !!input.retificacao,
    dataEmissaoEmpenho,
  };
}

export class EmpenhoUseCases {
  constructor(
    private readonly repo: IEmpenhoRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  private async garantirEmpenhoNoAjuste(ajusteId: string, id: string): Promise<Empenho> {
    const empenho = await this.repo.buscarPorId(id);
    if (!empenho || empenho.ajusteId !== ajusteId)
      throw new NotFoundError('Empenho não encontrado.');
    return empenho;
  }

  private async checarDuplicado(ajusteId: string, dados: DadosEmpenho, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(ajusteId, dados.numeroEmpenho, dados.anoEmpenho);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError(
        'Já existe um empenho com este número e ano neste ajuste.',
        'EMPENHO_DUPLICADO',
      );
  }

  async listar(ajusteId: string): Promise<Empenho[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async criar(ajusteId: string, input: EmpenhoDTO): Promise<Empenho> {
    await this.garantirAjuste(ajusteId);
    const dados = validar(input);
    await this.checarDuplicado(ajusteId, dados);
    return this.repo.criar(ajusteId, dados);
  }

  async atualizar(ajusteId: string, id: string, input: EmpenhoDTO): Promise<Empenho> {
    await this.garantirEmpenhoNoAjuste(ajusteId, id);
    const dados = validar(input);
    await this.checarDuplicado(ajusteId, dados, id);
    return this.repo.atualizar(id, dados);
  }

  async excluir(ajusteId: string, id: string): Promise<void> {
    await this.garantirEmpenhoNoAjuste(ajusteId, id);
    await this.repo.excluir(id);
  }
}

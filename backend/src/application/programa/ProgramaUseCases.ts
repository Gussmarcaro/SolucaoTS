import type { Meta, Programa } from '@/core/programa/Programa';
import type { IProgramaRepository } from './IProgramaRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosMeta, MetaDTO, ProgramaDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';

function validarMeta(input: MetaDTO): DadosMeta {
  const codigoMeta = input.codigoMeta?.trim() ?? '';
  if (!codigoMeta) throw new BusinessError('Informe o código da meta.');
  return {
    codigoMeta,
    descricao: input.descricao?.trim() || null,
    quantificavel: input.quantificavel ?? true,
  };
}

export class ProgramaUseCases {
  constructor(
    private readonly repo: IProgramaRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  private async garantirPrograma(ajusteId: string, programaId: string) {
    if (!(await this.repo.programaDoAjuste(ajusteId, programaId)))
      throw new NotFoundError('Programa não encontrado.');
  }

  private async garantirMeta(programaId: string, metaId: string) {
    if (!(await this.repo.metaDoPrograma(programaId, metaId)))
      throw new NotFoundError('Meta não encontrada.');
  }

  async listar(ajusteId: string): Promise<Programa[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async criarPrograma(ajusteId: string, input: ProgramaDTO): Promise<Programa> {
    await this.garantirAjuste(ajusteId);
    const nome = input.nome?.trim() ?? '';
    if (!nome) throw new BusinessError('Informe o nome do programa.');
    if (await this.repo.nomeExiste(ajusteId, nome))
      throw new ConflictError('Já existe um programa com este nome.', 'PROGRAMA_DUPLICADO');
    return this.repo.criarPrograma(ajusteId, nome);
  }

  async atualizarPrograma(ajusteId: string, programaId: string, input: ProgramaDTO): Promise<Programa> {
    await this.garantirPrograma(ajusteId, programaId);
    const nome = input.nome?.trim() ?? '';
    if (!nome) throw new BusinessError('Informe o nome do programa.');
    if (await this.repo.nomeExiste(ajusteId, nome, programaId))
      throw new ConflictError('Já existe um programa com este nome.', 'PROGRAMA_DUPLICADO');
    return this.repo.atualizarPrograma(programaId, nome);
  }

  async excluirPrograma(ajusteId: string, programaId: string): Promise<void> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.repo.excluirPrograma(programaId);
  }

  async criarMeta(ajusteId: string, programaId: string, input: MetaDTO): Promise<Meta> {
    await this.garantirPrograma(ajusteId, programaId);
    const dados = validarMeta(input);
    if (await this.repo.codigoExiste(programaId, dados.codigoMeta))
      throw new ConflictError('Já existe uma meta com este código no programa.', 'META_DUPLICADA');
    return this.repo.criarMeta(programaId, dados);
  }

  async atualizarMeta(ajusteId: string, programaId: string, metaId: string, input: MetaDTO): Promise<Meta> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.garantirMeta(programaId, metaId);
    const dados = validarMeta(input);
    if (await this.repo.codigoExiste(programaId, dados.codigoMeta, metaId))
      throw new ConflictError('Já existe uma meta com este código no programa.', 'META_DUPLICADA');
    return this.repo.atualizarMeta(metaId, dados);
  }

  async excluirMeta(ajusteId: string, programaId: string, metaId: string): Promise<void> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.garantirMeta(programaId, metaId);
    await this.repo.excluirMeta(metaId);
  }
}

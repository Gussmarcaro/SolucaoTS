import type { Meta, Programa } from '@/core/programa/Programa';
import type { IProgramaRepository } from './IProgramaRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosMeta, MetaDTO, ProgramaDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';

function validarMeta(input: MetaDTO): DadosMeta {
  const codigoMeta = input.codigoMeta?.trim() ?? '';
  if (!codigoMeta) throw new BusinessError('Informe o código da meta.');

  const quantificavel = input.quantificavel ?? true;

  /*
   * A quantidade prevista é obrigatória **na meta quantificável**, e proibida
   * na qualitativa.
   *
   * É o que dá sentido à marca: dizer que a meta é quantificável sem dizer
   * quanto deixa a aferição da prestação sem referência para comparar. E
   * guardar um número numa meta qualitativa criaria dado que nenhuma tela lê —
   * o caminho dela é "cumprida / não cumprida", não uma contagem.
   */
  const bruto = input.quantidadePrevista;
  const quantidade =
    bruto === undefined || bruto === null || bruto === ''
      ? null
      : typeof bruto === 'string'
        ? Number(bruto.replace(',', '.'))
        : bruto;

  if (quantificavel) {
    if (quantidade === null) throw new BusinessError('Informe a quantidade prevista da meta.');
    if (!Number.isFinite(quantidade) || quantidade <= 0)
      throw new BusinessError('A quantidade prevista da meta deve ser maior que zero.');
  }

  const unidade = input.unidadeMedida?.trim() || null;
  // Sem unidade, "5000" não diz se são consultas, horas ou toneladas — e é
  // justamente essa leitura que a Comissão de Fiscalização precisa fazer.
  if (quantificavel && !unidade)
    throw new BusinessError('Informe a unidade de medida da meta (consultas, atendimentos, horas...).');

  return {
    codigoMeta,
    descricao: input.descricao?.trim() || null,
    quantificavel,
    quantidadePrevista: quantificavel ? quantidade : null,
    unidadeMedida: quantificavel ? unidade : null,
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

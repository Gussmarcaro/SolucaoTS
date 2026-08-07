import type { AfericaoMeta } from '@/core/relatorioAtividade/AfericaoMeta';
import type { IRelatorioAtividadeRepository } from './IRelatorioAtividadeRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { AfericaoMetaDTO, DadosAfericaoMeta } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';

const RESULTADOS = ['CUMPRIDA', 'NAO_CUMPRIDA', 'CUMPRIDA_PARCIALMENTE'];

function validar(input: AfericaoMetaDTO): DadosAfericaoMeta {
  const nomePrograma = input.nomePrograma?.trim() ?? '';
  const codigoMeta = input.codigoMeta?.trim() ?? '';
  if (!nomePrograma) throw new BusinessError('Selecione o programa.');
  if (!codigoMeta) throw new BusinessError('Selecione a meta.');

  const periodo = typeof input.periodo === 'string' ? Number(input.periodo) : input.periodo;
  if (!Number.isInteger(periodo) || periodo < 1 || periodo > 15)
    throw new BusinessError('Período inválido (1 a 15).');

  const temQtd = input.quantidadeRealizada !== undefined && input.quantidadeRealizada !== null && input.quantidadeRealizada !== '';
  const temResultado = input.resultadoMeta !== undefined && input.resultadoMeta !== null;
  if (temQtd === temResultado)
    throw new BusinessError('Informe a quantidade realizada (meta quantificável) OU o resultado (meta qualitativa).');

  let quantidadeRealizada: number | null = null;
  let resultadoMeta: AfericaoMeta['resultadoMeta'] = null;
  if (temQtd) {
    const q = Number(input.quantidadeRealizada);
    if (!Number.isFinite(q) || q < 0) throw new BusinessError('Quantidade realizada inválida.');
    quantidadeRealizada = q;
  } else {
    if (!RESULTADOS.includes(input.resultadoMeta as string)) throw new BusinessError('Resultado da meta inválido.');
    resultadoMeta = input.resultadoMeta as AfericaoMeta['resultadoMeta'];
  }

  const metaAtendida = input.metaAtendida ?? null;
  const justificativaMeta = input.justificativaMeta?.trim() || null;
  if (metaAtendida === false && !justificativaMeta)
    throw new BusinessError('Informe a justificativa quando a meta não for atendida.');

  return {
    nomePrograma,
    codigoMeta,
    periodo,
    quantidadeRealizada,
    resultadoMeta,
    justificativaPeriodo: input.justificativaPeriodo?.trim() || null,
    metaAtendida,
    justificativaMeta,
  };
}

export class RelatorioAtividadeUseCases {
  constructor(
    private readonly repo: IRelatorioAtividadeRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<AfericaoMeta> {
    const a = await this.repo.buscarPorId(id);
    if (!a || a.prestacaoId !== prestacaoId) throw new NotFoundError('Aferição não encontrada.');
    return a;
  }

  private async checarDuplicado(prestacaoId: string, d: DadosAfericaoMeta, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(prestacaoId, d.nomePrograma, d.codigoMeta, d.periodo);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError('Já existe uma aferição desta meta neste período.', 'AFERICAO_DUPLICADA');
  }

  async listar(prestacaoId: string): Promise<AfericaoMeta[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: AfericaoMetaDTO): Promise<AfericaoMeta> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: AfericaoMetaDTO): Promise<AfericaoMeta> {
    await this.garantirNaPrestacao(prestacaoId, id);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados, id);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

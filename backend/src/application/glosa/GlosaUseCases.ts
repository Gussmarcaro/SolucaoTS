import type { Glosa } from '@/core/glosa/Glosa';
import type { IGlosaRepository } from './IGlosaRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosGlosa, GlosaDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

const RESULTADOS = ['APROVADO', 'APROVADO_PARCIALMENTE', 'REPROVADO'];

function validar(input: GlosaDTO): DadosGlosa {
  if (!RESULTADOS.includes(input.resultadoAnalise))
    throw new BusinessError('Resultado da análise inválido.');

  const documentoFiscalId = input.documentoFiscalId?.trim() || null;
  let pagamentoData: Date | null = null;
  if (input.pagamentoData) {
    try {
      pagamentoData = parseDataISO(input.pagamentoData);
    } catch {
      throw new BusinessError('Data do pagamento inválida.');
    }
  }
  if (!documentoFiscalId && !pagamentoData)
    throw new BusinessError('Vincule a um documento fiscal ou informe a data da folha.');

  let valorGlosa: number | null = null;
  if (input.resultadoAnalise === 'APROVADO_PARCIALMENTE') {
    const v = input.valorGlosa == null || input.valorGlosa === '' ? null : Number(input.valorGlosa);
    if (v == null || !Number.isFinite(v) || v <= 0)
      throw new BusinessError('Para aprovação parcial, informe o valor glosado (> 0).');
    valorGlosa = v;
  }

  return { documentoFiscalId, pagamentoData, resultadoAnalise: input.resultadoAnalise, valorGlosa };
}

export class GlosaUseCases {
  constructor(
    private readonly repo: IGlosaRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Glosa> {
    const g = await this.repo.buscarPorId(id);
    if (!g || g.prestacaoId !== prestacaoId) throw new NotFoundError('Glosa não encontrada.');
    return g;
  }

  private async validarDoc(prestacaoId: string, dados: DadosGlosa) {
    if (dados.documentoFiscalId && !(await this.repo.docPertenceAPrestacao(prestacaoId, dados.documentoFiscalId)))
      throw new BusinessError('Documento fiscal vinculado não pertence a esta prestação.');
  }

  async listar(prestacaoId: string): Promise<Glosa[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: GlosaDTO): Promise<Glosa> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.validarDoc(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: GlosaDTO): Promise<Glosa> {
    await this.garantirNaPrestacao(prestacaoId, id);
    const dados = validar(input);
    await this.validarDoc(prestacaoId, dados);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

import type { Repasse } from '@/core/repasse/Repasse';
import type { IRepasseRepository } from './IRepasseRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { IEmpenhoPrestacaoRepository } from '@/application/empenhoPrestacao/IEmpenhoPrestacaoRepository';
import type { DadosRepasse, RepasseDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO, paraDataISO } from '@/shared/datas';

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function centavos(n: number): number {
  return Math.round(n * 100);
}

function normalizar(input: RepasseDTO): DadosRepasse {
  let dataPrevista: Date;
  let dataRepasse: Date;
  try {
    dataPrevista = parseDataISO(input.dataPrevista);
  } catch {
    throw new BusinessError('Data prevista inválida.');
  }
  try {
    dataRepasse = parseDataISO(input.dataRepasse);
  } catch {
    throw new BusinessError('Data do repasse inválida.');
  }

  const valorPrevisto = num(input.valorPrevisto);
  const valorRepasse = num(input.valorRepasse);
  if (valorPrevisto == null || valorPrevisto < 0) throw new BusinessError('Valor previsto inválido.');
  if (valorRepasse == null || valorRepasse <= 0) throw new BusinessError('Valor do repasse inválido.');

  const justificativaDiferenca = input.justificativaDiferenca?.trim() || null;
  if (centavos(valorPrevisto) !== centavos(valorRepasse) && !justificativaDiferenca)
    throw new BusinessError('Informe a justificativa quando o valor previsto difere do repassado.');

  return {
    empenhoId: input.empenhoId?.trim() || null,
    dataPrevista,
    dataRepasse,
    valorPrevisto,
    valorRepasse,
    justificativaDiferenca,
    tipoDocumentoBancario: num(input.tipoDocumentoBancario),
    descricaoOutros: input.descricaoOutros?.trim() || null,
    numeroDocumento: input.numeroDocumento?.trim() || null,
    banco: num(input.banco),
    agencia: num(input.agencia),
    conta: input.conta?.trim() || null,
  };
}

export class RepasseUseCases {
  constructor(
    private readonly repo: IRepasseRepository,
    private readonly prestacoes: IPrestacaoRepository,
    private readonly empenhos: IEmpenhoPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Repasse> {
    const r = await this.repo.buscarPorId(id);
    if (!r || r.prestacaoId !== prestacaoId) throw new NotFoundError('Repasse não encontrado.');
    return r;
  }

  /** Regras §7 #18 que dependem do empenho vinculado. */
  private async validarEmpenho(prestacaoId: string, dados: DadosRepasse, ignorarId?: string) {
    if (!dados.empenhoId) return;

    const empenho = await this.empenhos.buscarPorId(dados.empenhoId);
    if (!empenho || empenho.prestacaoId !== prestacaoId)
      throw new BusinessError('Empenho vinculado não pertence a esta prestação.');

    if (paraDataISO(dados.dataRepasse) < empenho.dataEmissao)
      throw new BusinessError('A data do repasse não pode ser anterior à emissão do empenho.');

    const jaRepassado = await this.repo.somaRepassesEmpenho(dados.empenhoId, ignorarId);
    if (centavos(jaRepassado + dados.valorRepasse) > centavos(empenho.valor))
      throw new BusinessError('A soma dos repasses excede o valor do empenho.');
  }

  async listar(prestacaoId: string): Promise<Repasse[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: RepasseDTO): Promise<Repasse> {
    await this.garantirPrestacao(prestacaoId);
    const dados = normalizar(input);
    await this.validarEmpenho(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: RepasseDTO): Promise<Repasse> {
    await this.garantirNaPrestacao(prestacaoId, id);
    const dados = normalizar(input);
    await this.validarEmpenho(prestacaoId, dados, id);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

import type { EmpenhoPrestacao } from '@/core/empenhoPrestacao/EmpenhoPrestacao';
import type { IEmpenhoPrestacaoRepository } from './IEmpenhoPrestacaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosEmpenhoPrestacao, EmpenhoPrestacaoDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';

function validar(input: EmpenhoPrestacaoDTO): DadosEmpenhoPrestacao {
  const numero = input.numero?.trim() ?? '';
  const classificacaoEconomica = input.classificacaoEconomica?.trim() ?? '';
  const cpf = apenasDigitos(input.cpfOrdenadorDespesa);

  if (!numero) throw new BusinessError('Informe o número do empenho.');
  if (!classificacaoEconomica) throw new BusinessError('Informe a classificação econômica.');
  if (!isDocumentoValido(cpf, 'CPF')) throw new BusinessError('CPF do ordenador de despesa inválido.');

  let dataEmissao: Date;
  try {
    dataEmissao = parseDataISO(input.dataEmissao);
  } catch {
    throw new BusinessError('Data de emissão inválida.');
  }

  const fonteRecursoTipo =
    typeof input.fonteRecursoTipo === 'string' ? Number(input.fonteRecursoTipo) : input.fonteRecursoTipo;
  if (!Number.isFinite(fonteRecursoTipo) || fonteRecursoTipo <= 0)
    throw new BusinessError('Informe a fonte de recurso.');

  const valor = typeof input.valor === 'string' ? Number(input.valor) : input.valor;
  if (!Number.isFinite(valor) || valor <= 0) throw new BusinessError('Valor do empenho inválido.');

  return {
    numero,
    dataEmissao,
    classificacaoEconomica,
    fonteRecursoTipo,
    valor,
    historico: input.historico?.trim() || null,
    cpfOrdenadorDespesa: cpf,
  };
}

export class EmpenhoPrestacaoUseCases {
  constructor(
    private readonly repo: IEmpenhoPrestacaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<EmpenhoPrestacao> {
    const e = await this.repo.buscarPorId(id);
    if (!e || e.prestacaoId !== prestacaoId) throw new NotFoundError('Empenho não encontrado.');
    return e;
  }

  private async checarDuplicado(prestacaoId: string, d: DadosEmpenhoPrestacao, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(prestacaoId, d.numero, d.dataEmissao);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError('Já existe um empenho com este número e data de emissão.', 'EMPENHO_DUPLICADO');
  }

  async listar(prestacaoId: string): Promise<EmpenhoPrestacao[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: EmpenhoPrestacaoDTO): Promise<EmpenhoPrestacao> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: EmpenhoPrestacaoDTO): Promise<EmpenhoPrestacao> {
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

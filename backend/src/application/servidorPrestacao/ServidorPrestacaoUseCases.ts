import type { PeriodoCessao, ServidorPrestacao } from '@/core/servidorPrestacao/ServidorPrestacao';
import type { IServidorPrestacaoRepository } from './IServidorPrestacaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosServidorPrestacao, ServidorPrestacaoDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';

function validarPeriodos(input: ServidorPrestacaoDTO['periodos']): PeriodoCessao[] {
  if (!input || input.length === 0) return [];
  return input.map((p, i) => {
    const mes = Number(p.mes);
    const cargaHoraria = Number(p.cargaHoraria);
    const remuneracaoBruta = Number(p.remuneracaoBruta);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new BusinessError(`Período ${i + 1}: mês inválido.`);
    if (!Number.isFinite(cargaHoraria) || cargaHoraria < 0) throw new BusinessError(`Período ${i + 1}: carga horária inválida.`);
    if (!Number.isFinite(remuneracaoBruta) || remuneracaoBruta < 0) throw new BusinessError(`Período ${i + 1}: remuneração inválida.`);
    return { mes, cargaHoraria, remuneracaoBruta };
  });
}

function validar(input: ServidorPrestacaoDTO): DadosServidorPrestacao {
  const cpf = apenasDigitos(input.cpf);
  if (!isDocumentoValido(cpf, 'CPF')) throw new BusinessError('CPF inválido.');

  const cargoPublico = input.cargoPublico?.trim() ?? '';
  const funcaoEntidade = input.funcaoEntidade?.trim() ?? '';
  if (!cargoPublico) throw new BusinessError('Informe o cargo público.');
  if (!funcaoEntidade) throw new BusinessError('Informe a função na entidade.');

  let dataInicialCessao: Date;
  try {
    dataInicialCessao = parseDataISO(input.dataInicialCessao);
  } catch {
    throw new BusinessError('Data inicial da cessão inválida.');
  }

  let dataFinalCessao: Date | null = null;
  if (input.dataFinalCessao) {
    try {
      dataFinalCessao = parseDataISO(input.dataFinalCessao);
    } catch {
      throw new BusinessError('Data final da cessão inválida.');
    }
    if (dataFinalCessao < dataInicialCessao)
      throw new BusinessError('A data final não pode ser anterior à inicial.');
  }

  const onusPagamento = typeof input.onusPagamento === 'string' ? Number(input.onusPagamento) : input.onusPagamento;
  if (!Number.isInteger(onusPagamento) || onusPagamento <= 0)
    throw new BusinessError('Informe o ônus do pagamento.');

  return {
    cpf,
    dataInicialCessao,
    dataFinalCessao,
    cargoPublico,
    funcaoEntidade,
    onusPagamento,
    periodos: validarPeriodos(input.periodos),
  };
}

export class ServidorPrestacaoUseCases {
  constructor(
    private readonly repo: IServidorPrestacaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<ServidorPrestacao> {
    const s = await this.repo.buscarPorId(id);
    if (!s || s.prestacaoId !== prestacaoId) throw new NotFoundError('Servidor não encontrado.');
    return s;
  }

  private async checarDuplicado(prestacaoId: string, dados: DadosServidorPrestacao, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(prestacaoId, dados.cpf, dados.dataInicialCessao);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError('Já existe um servidor com este CPF e data inicial de cessão.', 'SERVIDOR_DUPLICADO');
  }

  async listar(prestacaoId: string): Promise<ServidorPrestacao[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: ServidorPrestacaoDTO): Promise<ServidorPrestacao> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: ServidorPrestacaoDTO): Promise<ServidorPrestacao> {
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

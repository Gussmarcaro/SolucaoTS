import type { Empregado, PeriodoRemuneracao } from '@/core/empregado/Empregado';
import type { IEmpregadoRepository } from './IEmpregadoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosEmpregado, EmpregadoDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';

/** CBO do subgrupo 225 = médicos → CNS obrigatório. */
const ehMedico = (cbo: string) => /^225/.test(cbo);

function validarPeriodos(input: EmpregadoDTO['periodos']): PeriodoRemuneracao[] {
  if (!input || input.length === 0) return [];
  return input.map((p, i) => {
    const mes = Number(p.mes);
    const cargaHoraria = Number(p.cargaHoraria);
    const remuneracaoBruta = Number(p.remuneracaoBruta);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12)
      throw new BusinessError(`Período ${i + 1}: mês inválido.`);
    if (!Number.isFinite(cargaHoraria) || cargaHoraria < 0)
      throw new BusinessError(`Período ${i + 1}: carga horária inválida.`);
    if (!Number.isFinite(remuneracaoBruta) || remuneracaoBruta < 0)
      throw new BusinessError(`Período ${i + 1}: remuneração inválida.`);
    return { mes, cargaHoraria, remuneracaoBruta };
  });
}

function validar(input: EmpregadoDTO): DadosEmpregado {
  const cpf = apenasDigitos(input.cpf);
  if (!isDocumentoValido(cpf, 'CPF')) throw new BusinessError('CPF inválido.');

  let dataAdmissao: Date;
  try {
    dataAdmissao = parseDataISO(input.dataAdmissao);
  } catch {
    throw new BusinessError('Data de admissão inválida.');
  }

  let dataDemissao: Date | null = null;
  if (input.dataDemissao) {
    try {
      dataDemissao = parseDataISO(input.dataDemissao);
    } catch {
      throw new BusinessError('Data de demissão inválida.');
    }
    if (dataDemissao < dataAdmissao)
      throw new BusinessError('A demissão não pode ser anterior à admissão.');
  }

  const cbo = apenasDigitos(input.cbo);
  if (cbo.length !== 6) throw new BusinessError('CBO deve ter 6 dígitos.');

  const cns = input.cns ? apenasDigitos(input.cns) : null;
  if (cns && cns.length !== 15) throw new BusinessError('CNS deve ter 15 dígitos.');
  if (ehMedico(cbo) && !cns)
    throw new BusinessError('CNS é obrigatório para médicos (CBO 225).');

  const salario =
    typeof input.salarioContratual === 'string' ? Number(input.salarioContratual) : input.salarioContratual;
  if (!Number.isFinite(salario) || salario <= 0)
    throw new BusinessError('Salário contratual inválido.');

  return {
    cpf,
    dataAdmissao,
    dataDemissao,
    cbo,
    cns,
    salarioContratual: salario,
    periodos: validarPeriodos(input.periodos),
  };
}

export class EmpregadoUseCases {
  constructor(
    private readonly repo: IEmpregadoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Empregado> {
    const e = await this.repo.buscarPorId(id);
    if (!e || e.prestacaoId !== prestacaoId) throw new NotFoundError('Empregado não encontrado.');
    return e;
  }

  private async checarDuplicado(prestacaoId: string, dados: DadosEmpregado, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(prestacaoId, dados.cpf, dados.dataAdmissao);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError('Já existe um empregado com este CPF e data de admissão.', 'EMPREGADO_DUPLICADO');
  }

  async listar(prestacaoId: string): Promise<Empregado[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: EmpregadoDTO): Promise<Empregado> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: EmpregadoDTO): Promise<Empregado> {
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

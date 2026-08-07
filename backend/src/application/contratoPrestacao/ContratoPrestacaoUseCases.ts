import type { TipoDocumento, TipoVigencia } from '@prisma/client';
import type { ContratoPrestacao } from '@/core/contratoPrestacao/ContratoPrestacao';
import type { IContratoPrestacaoRepository } from './IContratoPrestacaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { ContratoDTO, DadosContrato } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import { apenasDigitos, isCPFValido, isCNPJValido } from '@/shared/validators/documento';

const TIPOS_DOC = ['CPF', 'CNPJ', 'RNE'];
const TIPOS_VIG = ['PRE_ESTABELECIDA', 'INDETERMINADA'];

function validar(input: ContratoDTO): DadosContrato {
  const numero = input.numero?.trim() ?? '';
  if (!numero) throw new BusinessError('Informe o número do contrato.');

  const credorTipoDoc = String(input.credorTipoDoc ?? '').trim().toUpperCase();
  if (!TIPOS_DOC.includes(credorTipoDoc)) throw new BusinessError('Tipo de documento do credor inválido.');
  const credorNumeroDoc = credorTipoDoc === 'RNE' ? (input.credorNumeroDoc?.trim() ?? '') : apenasDigitos(input.credorNumeroDoc ?? '');
  if (credorTipoDoc === 'CPF' && !isCPFValido(credorNumeroDoc)) throw new BusinessError('CPF do credor inválido.');
  if (credorTipoDoc === 'CNPJ' && !isCNPJValido(credorNumeroDoc)) throw new BusinessError('CNPJ do credor inválido.');
  const credorNome = input.credorNome?.trim() || null;
  if (credorTipoDoc === 'RNE' && !credorNome) throw new BusinessError('Informe o nome do credor (RNE).');

  let dataAssinatura: Date;
  try {
    dataAssinatura = parseDataISO(input.dataAssinatura);
  } catch {
    throw new BusinessError('Data de assinatura inválida.');
  }

  const vigenciaTipo = String(input.vigenciaTipo ?? '').trim().toUpperCase();
  if (!TIPOS_VIG.includes(vigenciaTipo)) throw new BusinessError('Tipo de vigência inválido.');

  let vigenciaDataInicial: Date;
  try {
    vigenciaDataInicial = parseDataISO(input.vigenciaDataInicial);
  } catch {
    throw new BusinessError('Início de vigência inválido.');
  }

  let vigenciaDataFinal: Date | null = null;
  if (input.vigenciaDataFinal) {
    try {
      vigenciaDataFinal = parseDataISO(input.vigenciaDataFinal);
    } catch {
      throw new BusinessError('Fim de vigência inválido.');
    }
    if (vigenciaDataFinal < vigenciaDataInicial)
      throw new BusinessError('O fim da vigência não pode ser anterior ao início.');
  }
  if (vigenciaTipo === 'PRE_ESTABELECIDA' && !vigenciaDataFinal)
    throw new BusinessError('Informe a data final da vigência (pré-estabelecida).');

  const objeto = input.objeto?.trim() ?? '';
  if (!objeto) throw new BusinessError('Informe o objeto do contrato.');

  const naturezaContratacao = (input.naturezaContratacao ?? [])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n));
  const naturezaOutro = input.naturezaOutro?.trim() || null;
  if (naturezaContratacao.includes(23) && !naturezaOutro)
    throw new BusinessError('Descreva os "Outros Serviços" (natureza 23).');

  const criterioSelecao = input.criterioSelecao == null || input.criterioSelecao === '' ? null : Number(input.criterioSelecao);
  const criterioSelecaoOutro = input.criterioSelecaoOutro?.trim() || null;
  if (criterioSelecao === 4 && !criterioSelecaoOutro)
    throw new BusinessError('Descreva o "Outro" critério de seleção (critério 4).');

  const valorMontante = typeof input.valorMontante === 'string' ? Number(input.valorMontante) : input.valorMontante;
  if (!Number.isFinite(valorMontante) || valorMontante < 0) throw new BusinessError('Valor do contrato inválido.');

  const valorTipo = input.valorTipo == null || input.valorTipo === '' ? null : Number(input.valorTipo);

  return {
    numero,
    credorTipoDoc: credorTipoDoc as TipoDocumento,
    credorNumeroDoc,
    credorNome,
    dataAssinatura,
    vigenciaTipo: vigenciaTipo as TipoVigencia,
    vigenciaDataInicial,
    vigenciaDataFinal,
    objeto,
    naturezaContratacao,
    naturezaOutro,
    criterioSelecao,
    criterioSelecaoOutro,
    artigoRegulamentoCompras: input.artigoRegulamentoCompras?.trim() || null,
    valorMontante,
    valorTipo,
  };
}

export class ContratoPrestacaoUseCases {
  constructor(
    private readonly repo: IContratoPrestacaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<ContratoPrestacao> {
    const c = await this.repo.buscarPorId(id);
    if (!c || c.prestacaoId !== prestacaoId) throw new NotFoundError('Contrato não encontrado.');
    return c;
  }

  async listar(prestacaoId: string): Promise<ContratoPrestacao[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: ContratoDTO): Promise<ContratoPrestacao> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: ContratoDTO): Promise<ContratoPrestacao> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

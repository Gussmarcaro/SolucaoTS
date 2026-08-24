import {
  TIPOS_DOCUMENTO_FISCAL,
  type TipoDocumentoFiscal,
} from '@/core/documentoFiscal/DocumentoFiscal';
import type { DocumentoFiscal } from '@/core/documentoFiscal/DocumentoFiscal';
import type { IDocumentoFiscalRepository } from './IDocumentoFiscalRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosDocumentoFiscal, DocumentoFiscalDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO } from '@/shared/datas';

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function validar(input: DocumentoFiscalDTO): DadosDocumentoFiscal {
  const numero = input.numero?.trim() ?? '';
  const tipo = input.credorTipoDoc;
  const credorNumeroDoc =
    tipo === 'RNE' ? (input.credorNumeroDoc?.trim() ?? '') : apenasDigitos(input.credorNumeroDoc);
  const credorNome = input.credorNome?.trim() || null;
  const descricao = input.descricao?.trim() ?? '';

  if (!numero) throw new BusinessError('Informe o número do documento fiscal.');
  if (tipo !== 'CPF' && tipo !== 'CNPJ' && tipo !== 'RNE')
    throw new BusinessError('Tipo de documento do credor inválido.');
  if (tipo === 'RNE') {
    if (!credorNumeroDoc) throw new BusinessError('Informe o RNE do credor.');
    if (!credorNome) throw new BusinessError('Para RNE, informe o nome do credor.');
  } else if (!isDocumentoValido(credorNumeroDoc, tipo)) {
    throw new BusinessError(`${tipo} do credor inválido.`);
  }
  if (!descricao) throw new BusinessError('Informe a descrição.');

  let dataEmissao: Date;
  try {
    dataEmissao = parseDataISO(input.dataEmissao);
  } catch {
    throw new BusinessError('Data de emissão inválida.');
  }

  const valorBruto = num(input.valorBruto);
  if (valorBruto == null || valorBruto <= 0) throw new BusinessError('Valor bruto inválido.');
  const valorEncargos = num(input.valorEncargos) ?? 0;
  if (valorEncargos < 0) throw new BusinessError('Valor de encargos não pode ser negativo.');
  if (valorEncargos >= valorBruto)
    throw new BusinessError('Os encargos devem ser menores que o valor bruto.');

  // Espécie do documento: opcional, e conferida contra a lista fechada.
  // Opcional porque não é dado que o TCESP cobre e os documentos gravados antes
  // deste campo não têm nenhuma — exigi-la obrigaria a reeditar todos eles.
  const tipoDoc = input.tipoDocumento?.trim() || null;
  if (tipoDoc !== null && !TIPOS_DOCUMENTO_FISCAL.includes(tipoDoc as TipoDocumentoFiscal))
    throw new BusinessError('Tipo do documento fiscal inválido.');

  const categoriaDespesaTipo = num(input.categoriaDespesaTipo);
  if (categoriaDespesaTipo == null || categoriaDespesaTipo <= 0)
    throw new BusinessError('Informe a categoria de despesa.');

  const rateioProveniente = !!input.rateioProveniente;
  const rateioPercentual = rateioProveniente ? num(input.rateioPercentual) : null;
  if (rateioProveniente && (rateioPercentual == null || rateioPercentual <= 0 || rateioPercentual > 100))
    throw new BusinessError('Percentual de rateio inválido (0–100).');

  return {
    numero,
    credorTipoDoc: tipo,
    credorNumeroDoc,
    credorNome,
    contratoNumero: input.contratoNumero?.trim() || null,
    descricao,
    dataEmissao,
    estadoEmissor: num(input.estadoEmissor),
    valorBruto,
    valorEncargos,
    tipoDocumento: tipoDoc as TipoDocumentoFiscal | null,
    categoriaDespesaTipo,
    rateioProveniente,
    rateioPercentual,
  };
}

export class DocumentoFiscalUseCases {
  constructor(
    private readonly repo: IDocumentoFiscalRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirDocNaPrestacao(prestacaoId: string, id: string): Promise<DocumentoFiscal> {
    const doc = await this.repo.buscarPorId(id);
    if (!doc || doc.prestacaoId !== prestacaoId)
      throw new NotFoundError('Documento fiscal não encontrado.');
    return doc;
  }

  private async checarDuplicado(prestacaoId: string, d: DadosDocumentoFiscal, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicado(prestacaoId, d.numero, d.credorTipoDoc, d.credorNumeroDoc);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError(
        'Já existe um documento fiscal com este número e credor.',
        'DOC_FISCAL_DUPLICADO',
      );
  }

  async listar(prestacaoId: string): Promise<DocumentoFiscal[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: DocumentoFiscalDTO): Promise<DocumentoFiscal> {
    await this.garantirPrestacao(prestacaoId);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: DocumentoFiscalDTO): Promise<DocumentoFiscal> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    const dados = validar(input);
    await this.checarDuplicado(prestacaoId, dados, id);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}

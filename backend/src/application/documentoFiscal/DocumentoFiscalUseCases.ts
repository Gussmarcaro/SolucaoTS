import {
  TIPOS_DOCUMENTO_FISCAL,
  TIPOS_RETENCAO,
  type TipoDocumentoFiscal,
  type TipoRetencao,
} from '@/core/documentoFiscal/DocumentoFiscal';
import type { ArquivoPdf } from '@/core/entidade/complementos';
import type { DocumentoFiscal } from '@/core/documentoFiscal/DocumentoFiscal';
import type { IDocumentoFiscalRepository } from './IDocumentoFiscalRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosDocumentoFiscal, DocumentoFiscalDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { apenasDigitos, isDocumentoValido } from '@/shared/validators/documento';
import { parseDataISO, paraDataISO } from '@/shared/datas';
import type { IRateioRepository } from '@/application/rateio/IRateioRepository';
import { calcularRateio } from '@/core/rateio/Rateio';

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

  // Retenção: opcional e conferida contra a lista. Não é exigida junto do
  // valor porque os documentos anteriores a este campo têm valor e nenhum tipo.
  const retencao = input.retencaoTipo?.trim() || null;
  if (retencao !== null && !TIPOS_RETENCAO.includes(retencao as TipoRetencao))
    throw new BusinessError('Tipo de retenção inválido.');

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
  const rateioEscolhido = rateioProveniente && !!input.rateioId?.trim();
  // Com um rateio escolhido, o percentual não vem da tela — `aplicarRateio` o
  // calcula do quadro. Exigi-lo aqui obrigaria o cliente a mandar um número que
  // o servidor vai descartar, e um número que ele mande errado passaria a
  // parecer aceito.
  if (rateioProveniente && !rateioEscolhido && (rateioPercentual == null || rateioPercentual <= 0 || rateioPercentual > 100))
    throw new BusinessError('Percentual de rateio inválido (0–100).');

  return {
    numero,
    credorTipoDoc: tipo,
    credorNumeroDoc,
    credorNome,
    contratoNumero: input.contratoNumero?.trim() || null,
    contratoId: input.contratoId?.trim() || null,
    descricao,
    dataEmissao,
    estadoEmissor: num(input.estadoEmissor),
    valorBruto,
    valorEncargos,
    retencaoTipo: retencao as TipoRetencao | null,
    tipoDocumento: tipoDoc as TipoDocumentoFiscal | null,
    categoriaDespesaTipo,
    // Rubrica da proposta: texto livre vindo do plano do ajuste. Não se valida
    // contra o plano aqui — ele é reimportável, e barrar uma rubrica que existia
    // no momento do lançamento tornaria o documento antigo ineditável.
    propostaCategoria: input.propostaCategoria?.trim() || null,
    propostaSubcategoria: input.propostaSubcategoria?.trim() || null,
    rateioProveniente,
    rateioId: rateioProveniente ? input.rateioId?.trim() || null : null,
    rateioPercentual,
  };
}

export class DocumentoFiscalUseCases {
  constructor(
    private readonly repo: IDocumentoFiscalRepository,
    private readonly prestacoes: IPrestacaoRepository,
    /** Para calcular o percentual do rateio — ver `aplicarRateio`. */
    private readonly rateios?: IRateioRepository,
  ) {}

  /**
   * Substitui o percentual pelo que o rateio escolhido determina.
   *
   * O percentual **não vem da tela**: vem do rateio, para o ajuste desta
   * prestação. Aceitar o número do cliente permitiria gravar 30% num ajuste que
   * o rateio diz ser 10%, e nada acusaria.
   *
   * O valor gravado é uma **fotografia**: editar o rateio depois não mexe em
   * nota já lançada — a prestação é registro histórico.
   */
  private async aplicarRateio(prestacaoId: string, dados: DadosDocumentoFiscal) {
    if (!dados.rateioProveniente || !dados.rateioId) return;
    if (!this.rateios) return;

    const rateio = await this.rateios.buscarPorId(dados.rateioId);
    if (!rateio) throw new BusinessError('Rateio não encontrado.');
    if (!rateio.ativo) throw new BusinessError('Este rateio está inativo.');

    // Vigência: o rateio precisa valer na data de emissão da nota. É para isto
    // que o Período Adotado do cadastro existe.
    const emissao = paraDataISO(dados.dataEmissao);
    if (emissao < rateio.vigenciaInicio || emissao > rateio.vigenciaFim)
      throw new BusinessError(
        `O rateio "${rateio.titulo}" vale de ${rateio.vigenciaInicio} a ${rateio.vigenciaFim}, e a nota é de ${emissao}.`,
      );

    const prestacao = await this.prestacoes.buscarPorId(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');

    const participante = rateio.participantes.find((p) => p.ajusteId === prestacao.ajusteId);
    if (!participante)
      throw new BusinessError(
        `O ajuste desta prestação não participa do rateio "${rateio.titulo}". ` +
          'Inclua-o no quadro do rateio ou escolha outro método.',
      );

    const { linhas } = calcularRateio(
      rateio.participantes.map((p) => ({ ajusteId: p.ajusteId, base: p.base })),
    );
    dados.rateioPercentual =
      linhas.find((l) => l.ajusteId === prestacao.ajusteId)?.percentualExibido ?? 0;
  }

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
    await this.aplicarRateio(prestacaoId, dados);
    await this.checarDuplicado(prestacaoId, dados);
    return this.repo.criar(prestacaoId, dados);
  }

  async atualizar(prestacaoId: string, id: string, input: DocumentoFiscalDTO): Promise<DocumentoFiscal> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    const dados = validar(input);
    await this.aplicarRateio(prestacaoId, dados);
    await this.checarDuplicado(prestacaoId, dados, id);
    return this.repo.atualizar(id, dados);
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }

  /**
   * Anexa a digitalização da nota.
   *
   * Enviar de novo **substitui** o anterior: um documento fiscal tem uma nota,
   * e guardar versões antigas sem tela que as mostre seria peso morto no banco.
   */
  async anexarArquivo(
    prestacaoId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<DocumentoFiscal> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    if (!arquivo.tamanho) throw new BusinessError('O arquivo enviado está vazio.');
    return this.repo.salvarArquivo(id, arquivo);
  }

  async removerArquivo(prestacaoId: string, id: string): Promise<DocumentoFiscal> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    return this.repo.salvarArquivo(id, null);
  }

  /**
   * Conteúdo do anexo, para download.
   *
   * Passa pelo `garantirDocNaPrestacao` como todo o resto: sem isso, um id de
   * documento de outro órgão baixaria a nota dele — o recorte por tenant chega
   * aqui pela prestação, não pelo id do arquivo.
   */
  async obterArquivo(prestacaoId: string, id: string): Promise<ArquivoPdf> {
    await this.garantirDocNaPrestacao(prestacaoId, id);
    const arquivo = await this.repo.obterArquivo(id);
    if (!arquivo) throw new NotFoundError('Este documento fiscal não tem arquivo anexado.');
    return arquivo;
  }
}

import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import {
  aceitaVarios,
  type ArquivoPdf,
  type AtaDiretoriaArquivo,
  type DocumentoRegularidade,
  type MembroConselho,
  type MembroDiretoria,
} from '@/core/entidade/complementos';
import type { IEntidadeComplementosRepository } from './IEntidadeComplementosRepository';
import type {
  DocumentoRegularidadeDTO,
  MembroConselhoDTO,
  MembroDiretoriaDTO,
} from './dtos';
import {
  normalizarDocumento,
  normalizarMembroConselho,
  normalizarMembroDiretoria,
  validarPdf,
} from './validar';

/**
 * CRUD dos complementos da Entidade Beneficiária.
 *
 * Todo método começa confirmando que a entidade existe, e todas as consultas do
 * repositório filtram por `entidadeId` além do id do registro: assim um id de
 * outra entidade não é lido nem apagado por engano.
 */
export class EntidadeComplementosUseCases {
  constructor(private readonly repo: IEntidadeComplementosRepository) {}

  private async exigirEntidade(entidadeId: string): Promise<void> {
    if (!(await this.repo.entidadeExiste(entidadeId)))
      throw new NotFoundError('Entidade não encontrada.');
  }

  // ---- Diretoria ----

  async listarDiretoria(entidadeId: string): Promise<MembroDiretoria[]> {
    await this.exigirEntidade(entidadeId);
    return this.repo.listarDiretoria(entidadeId);
  }

  async criarMembroDiretoria(
    entidadeId: string,
    input: MembroDiretoriaDTO,
  ): Promise<MembroDiretoria> {
    await this.exigirEntidade(entidadeId);
    return this.repo.criarMembroDiretoria(entidadeId, normalizarMembroDiretoria(input));
  }

  async atualizarMembroDiretoria(
    entidadeId: string,
    id: string,
    input: MembroDiretoriaDTO,
  ): Promise<MembroDiretoria> {
    await this.exigirEntidade(entidadeId);
    return this.repo.atualizarMembroDiretoria(entidadeId, id, normalizarMembroDiretoria(input));
  }

  async excluirMembroDiretoria(entidadeId: string, id: string): Promise<void> {
    await this.exigirEntidade(entidadeId);
    return this.repo.excluirMembroDiretoria(entidadeId, id);
  }

  // ---- Atas de eleição da diretoria ----

  async listarAtasDiretoria(entidadeId: string): Promise<AtaDiretoriaArquivo[]> {
    await this.exigirEntidade(entidadeId);
    return this.repo.listarAtasDiretoria(entidadeId);
  }

  async anexarAtaDiretoria(entidadeId: string, arquivo: ArquivoPdf): Promise<AtaDiretoriaArquivo> {
    await this.exigirEntidade(entidadeId);
    validarPdf(arquivo);
    return this.repo.criarAtaDiretoria(entidadeId, arquivo);
  }

  async obterAtaDiretoria(entidadeId: string, id: string): Promise<ArquivoPdf> {
    await this.exigirEntidade(entidadeId);
    const arquivo = await this.repo.obterAtaDiretoria(entidadeId, id);
    if (!arquivo) throw new NotFoundError('Ata não encontrada.');
    return arquivo;
  }

  async excluirAtaDiretoria(entidadeId: string, id: string): Promise<void> {
    await this.exigirEntidade(entidadeId);
    return this.repo.excluirAtaDiretoria(entidadeId, id);
  }

  // ---- Conselhos ----

  async listarConselhos(entidadeId: string): Promise<MembroConselho[]> {
    await this.exigirEntidade(entidadeId);
    return this.repo.listarConselhos(entidadeId);
  }

  async criarMembroConselho(
    entidadeId: string,
    input: MembroConselhoDTO,
  ): Promise<MembroConselho> {
    await this.exigirEntidade(entidadeId);
    return this.repo.criarMembroConselho(entidadeId, normalizarMembroConselho(input));
  }

  async atualizarMembroConselho(
    entidadeId: string,
    id: string,
    input: MembroConselhoDTO,
  ): Promise<MembroConselho> {
    await this.exigirEntidade(entidadeId);
    return this.repo.atualizarMembroConselho(entidadeId, id, normalizarMembroConselho(input));
  }

  async excluirMembroConselho(entidadeId: string, id: string): Promise<void> {
    await this.exigirEntidade(entidadeId);
    return this.repo.excluirMembroConselho(entidadeId, id);
  }

  async salvarAtaConselho(
    entidadeId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<MembroConselho> {
    await this.exigirEntidade(entidadeId);
    validarPdf(arquivo);
    return this.repo.salvarAtaConselho(entidadeId, id, arquivo);
  }

  async obterAtaConselho(entidadeId: string, id: string): Promise<ArquivoPdf> {
    await this.exigirEntidade(entidadeId);
    const arquivo = await this.repo.obterAtaConselho(entidadeId, id);
    if (!arquivo) throw new NotFoundError('Este membro não tem ata anexada.');
    return arquivo;
  }

  async removerAtaConselho(entidadeId: string, id: string): Promise<MembroConselho> {
    await this.exigirEntidade(entidadeId);
    return this.repo.removerAtaConselho(entidadeId, id);
  }

  // ---- Regularidade fiscal / cadastral ----

  async listarDocumentos(entidadeId: string): Promise<DocumentoRegularidade[]> {
    await this.exigirEntidade(entidadeId);
    return this.repo.listarDocumentos(entidadeId);
  }

  async criarDocumento(
    entidadeId: string,
    input: DocumentoRegularidadeDTO,
  ): Promise<DocumentoRegularidade> {
    await this.exigirEntidade(entidadeId);
    const dados = normalizarDocumento(input);
    // Cada certidão é um documento único da entidade; só "Outras" acumula.
    if (!aceitaVarios(dados.tipo)) {
      const existente = await this.repo.buscarDocumentoPorTipo(entidadeId, dados.tipo);
      if (existente)
        throw new ConflictError(
          'Este documento já está cadastrado para a entidade. Edite o registro existente.',
          'DOCUMENTO_DUPLICADO',
        );
    }
    return this.repo.criarDocumento(entidadeId, dados);
  }

  async atualizarDocumento(
    entidadeId: string,
    id: string,
    input: DocumentoRegularidadeDTO,
  ): Promise<DocumentoRegularidade> {
    await this.exigirEntidade(entidadeId);
    const dados = normalizarDocumento(input);
    if (!aceitaVarios(dados.tipo)) {
      const existente = await this.repo.buscarDocumentoPorTipo(entidadeId, dados.tipo);
      if (existente && existente.id !== id)
        throw new BusinessError('Já existe outro documento cadastrado com este tipo.');
    }
    return this.repo.atualizarDocumento(entidadeId, id, dados);
  }

  async excluirDocumento(entidadeId: string, id: string): Promise<void> {
    await this.exigirEntidade(entidadeId);
    return this.repo.excluirDocumento(entidadeId, id);
  }

  async salvarArquivoDocumento(
    entidadeId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<DocumentoRegularidade> {
    await this.exigirEntidade(entidadeId);
    validarPdf(arquivo);
    return this.repo.salvarArquivoDocumento(entidadeId, id, arquivo);
  }

  async obterArquivoDocumento(entidadeId: string, id: string): Promise<ArquivoPdf> {
    await this.exigirEntidade(entidadeId);
    const arquivo = await this.repo.obterArquivoDocumento(entidadeId, id);
    if (!arquivo) throw new NotFoundError('Este documento não tem arquivo anexado.');
    return arquivo;
  }

  async removerArquivoDocumento(entidadeId: string, id: string): Promise<DocumentoRegularidade> {
    await this.exigirEntidade(entidadeId);
    return this.repo.removerArquivoDocumento(entidadeId, id);
  }
}

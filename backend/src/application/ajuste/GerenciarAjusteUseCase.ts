import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { ArquivoAjuste, TipoDocumentoAjuste } from './dtos';
import { DOCUMENTO_AJUSTE_LABEL } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

/** Teto do PDF anexado ao ajuste. Espelha o limite do multer na camada de entrada. */
export const TAMANHO_MAXIMO_TERMO = 5 * 1024 * 1024;

/**
 * Casos de uso pontuais: buscar o ajuste e cuidar dos PDFs anexados a ele.
 *
 * As regras valem para **qualquer** documento do ajuste — tamanho, vazio e
 * assinatura do arquivo — e por isso estão escritas uma vez só, com o tipo
 * entrando por parâmetro. Duplicá-las por documento seria a forma clássica de
 * um anexo aceitar o que o outro recusa, sem ninguém notar.
 */
export class GerenciarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async buscar(id: string): Promise<Ajuste> {
    const ajuste = await this.repo.buscarPorId(id);
    if (!ajuste) throw new NotFoundError('Ajuste não encontrado.');
    return ajuste;
  }

  async salvarDocumento(
    id: string,
    tipo: TipoDocumentoAjuste,
    arquivo: ArquivoAjuste,
  ): Promise<Ajuste> {
    await this.buscar(id);
    const rotulo = DOCUMENTO_AJUSTE_LABEL[tipo];
    if (!arquivo.tamanho) throw new BusinessError(`O arquivo do ${rotulo} está vazio.`);
    if (arquivo.tamanho > TAMANHO_MAXIMO_TERMO)
      throw new BusinessError(`O ${rotulo} excede o limite de 5 MB.`);
    // Assinatura do PDF (%PDF-): a extensão sozinha não prova o formato.
    if (arquivo.conteudo.subarray(0, 5).toString('latin1') !== '%PDF-')
      throw new BusinessError('O arquivo enviado não é um PDF válido.');
    return this.repo.salvarDocumento(id, tipo, arquivo);
  }

  async obterDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<ArquivoAjuste> {
    await this.buscar(id);
    const arquivo = await this.repo.obterDocumento(id, tipo);
    if (!arquivo)
      throw new NotFoundError(`Este ajuste não tem ${DOCUMENTO_AJUSTE_LABEL[tipo]} anexado.`);
    return arquivo;
  }

  async removerDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<Ajuste> {
    await this.buscar(id);
    return this.repo.removerDocumento(id, tipo);
  }
}

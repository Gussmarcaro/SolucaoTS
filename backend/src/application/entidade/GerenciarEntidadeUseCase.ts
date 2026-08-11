import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import type { ArquivoEstatuto } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

/** Teto do PDF do estatuto. Espelha o limite do multer na camada de entrada. */
export const TAMANHO_MAXIMO_ESTATUTO = 5 * 1024 * 1024;

/** Casos de uso pontuais: buscar, (in)ativar (soft delete) e o PDF do estatuto. */
export class GerenciarEntidadeUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async buscar(id: string): Promise<EntidadeBeneficiaria> {
    const entidade = await this.repo.buscarPorId(id);
    if (!entidade) throw new NotFoundError('Entidade não encontrada.');
    return entidade;
  }

  async definirAtivo(id: string, ativo: boolean): Promise<EntidadeBeneficiaria> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }

  async salvarEstatuto(id: string, arquivo: ArquivoEstatuto): Promise<EntidadeBeneficiaria> {
    const atual = await this.buscar(id);
    if (!arquivo.tamanho) throw new BusinessError('O arquivo do estatuto está vazio.');
    if (arquivo.tamanho > TAMANHO_MAXIMO_ESTATUTO)
      throw new BusinessError('O estatuto excede o limite de 5 MB.');
    // Assinatura do PDF (%PDF-): a extensão sozinha não prova o formato.
    if (arquivo.conteudo.subarray(0, 5).toString('latin1') !== '%PDF-')
      throw new BusinessError('O arquivo enviado não é um PDF válido.');
    // Substituir um estatuto que já existia é alteração; o primeiro envio, não.
    const substituindo = !!atual.estatutoArquivoNome;
    return this.repo.salvarEstatuto(id, arquivo, substituindo ? new Date() : undefined);
  }

  async obterEstatuto(id: string): Promise<ArquivoEstatuto> {
    await this.buscar(id);
    const arquivo = await this.repo.obterEstatuto(id);
    if (!arquivo) throw new NotFoundError('Esta entidade não tem estatuto anexado.');
    return arquivo;
  }

  async removerEstatuto(id: string): Promise<EntidadeBeneficiaria> {
    const atual = await this.buscar(id);
    return this.repo.removerEstatuto(id, atual.estatutoArquivoNome ? new Date() : undefined);
  }
}

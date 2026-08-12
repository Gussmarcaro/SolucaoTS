import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { ArquivoTermoCiencia } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

/** Teto do PDF do termo. Espelha o limite do multer na camada de entrada. */
export const TAMANHO_MAXIMO_TERMO = 5 * 1024 * 1024;

/** Casos de uso pontuais: buscar o ajuste e cuidar do Termo de Ciência (PDF). */
export class GerenciarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async buscar(id: string): Promise<Ajuste> {
    const ajuste = await this.repo.buscarPorId(id);
    if (!ajuste) throw new NotFoundError('Ajuste não encontrado.');
    return ajuste;
  }

  async salvarTermoCiencia(id: string, arquivo: ArquivoTermoCiencia): Promise<Ajuste> {
    await this.buscar(id);
    if (!arquivo.tamanho) throw new BusinessError('O arquivo do termo está vazio.');
    if (arquivo.tamanho > TAMANHO_MAXIMO_TERMO)
      throw new BusinessError('O termo excede o limite de 5 MB.');
    // Assinatura do PDF (%PDF-): a extensão sozinha não prova o formato.
    if (arquivo.conteudo.subarray(0, 5).toString('latin1') !== '%PDF-')
      throw new BusinessError('O arquivo enviado não é um PDF válido.');
    return this.repo.salvarTermoCiencia(id, arquivo);
  }

  async obterTermoCiencia(id: string): Promise<ArquivoTermoCiencia> {
    await this.buscar(id);
    const arquivo = await this.repo.obterTermoCiencia(id);
    if (!arquivo) throw new NotFoundError('Este ajuste não tem termo anexado.');
    return arquivo;
  }

  async removerTermoCiencia(id: string): Promise<Ajuste> {
    await this.buscar(id);
    return this.repo.removerTermoCiencia(id);
  }
}

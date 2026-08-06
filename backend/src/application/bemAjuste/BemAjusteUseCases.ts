import type { BemAjuste } from '@/core/bemAjuste/BemAjuste';
import type { IBemAjusteRepository } from './IBemAjusteRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { ResultadoImportacaoBens } from './dtos';
import { NotFoundError } from '@/shared/errors';
import { parseBensCedidos } from '@/infrastructure/parsers/parseBensCedidos';

export class BemAjusteUseCases {
  constructor(
    private readonly repo: IBemAjusteRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  async importar(ajusteId: string, texto: string): Promise<ResultadoImportacaoBens> {
    await this.garantirAjuste(ajusteId);
    const { itens, totalLinhas, ignoradas, erros } = parseBensCedidos(texto);
    const salvos = await this.repo.substituir(ajusteId, itens);
    return { itens: salvos, totalLinhas, importados: salvos.length, ignoradas, erros };
  }

  async listar(ajusteId: string): Promise<BemAjuste[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async limpar(ajusteId: string): Promise<void> {
    await this.garantirAjuste(ajusteId);
    await this.repo.substituir(ajusteId, []);
  }
}

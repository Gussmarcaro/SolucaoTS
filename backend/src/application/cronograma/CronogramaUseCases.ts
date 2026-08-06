import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';
import type { ICronogramaRepository } from './ICronogramaRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { ResultadoImportacaoCronograma } from './dtos';
import { NotFoundError } from '@/shared/errors';
import { parseCronograma } from '@/infrastructure/parsers/parseCronograma';

export class CronogramaUseCases {
  constructor(
    private readonly repo: ICronogramaRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  async importar(ajusteId: string, texto: string): Promise<ResultadoImportacaoCronograma> {
    await this.garantirAjuste(ajusteId);
    const { itens, totalLinhas, ignoradas, erros } = parseCronograma(texto);
    const salvos = await this.repo.substituir(ajusteId, itens);
    return { itens: salvos, totalLinhas, importados: salvos.length, ignoradas, erros };
  }

  async listar(ajusteId: string): Promise<CronogramaItem[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async limpar(ajusteId: string): Promise<void> {
    await this.garantirAjuste(ajusteId);
    await this.repo.substituir(ajusteId, []);
  }
}

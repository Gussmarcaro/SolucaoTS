import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';
import type { IPlanoAplicacaoRepository } from './IPlanoAplicacaoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { ResultadoImportacaoPlano } from './dtos';
import { NotFoundError } from '@/shared/errors';
import { parsePlanoAplicacao } from '@/infrastructure/parsers/parsePlanoAplicacao';

export class PlanoAplicacaoUseCases {
  constructor(
    private readonly repo: IPlanoAplicacaoRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  async importar(ajusteId: string, texto: string): Promise<ResultadoImportacaoPlano> {
    await this.garantirAjuste(ajusteId);
    const { itens, totalLinhas, ignoradas, erros } = parsePlanoAplicacao(texto);
    const salvos = await this.repo.substituir(ajusteId, itens);
    return { itens: salvos, totalLinhas, importados: salvos.length, ignoradas, erros };
  }

  async listar(ajusteId: string): Promise<PlanoAplicacaoItem[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async limpar(ajusteId: string): Promise<void> {
    await this.garantirAjuste(ajusteId);
    await this.repo.substituir(ajusteId, []);
  }
}

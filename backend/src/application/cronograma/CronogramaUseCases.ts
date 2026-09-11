import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';
import type { ICronogramaRepository } from './ICronogramaRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { CronogramaDigitadoDTO, DadosCronogramaItem, ResultadoImportacaoCronograma } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { ehRubricaPadrao } from '@/core/planoAplicacao/planoPadrao';
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

  /**
   * Grava o cronograma digitado: uma linha por rubrica **e** mês.
   *
   * Sem a regra de ×12 do plano, e de propósito — o cronograma existe
   * justamente porque os meses diferem: 13º em dezembro, rescisões
   * concentradas, reajuste a partir de maio. Se fossem todos iguais, o plano já
   * responderia.
   *
   * **Substitui o cronograma inteiro**, como a importação de CSV. Mesclar
   * deixaria meses de uma versão anterior pendurados — e num cronograma isso
   * aparece como dinheiro previsto duas vezes.
   */
  async salvarDigitado(ajusteId: string, input: CronogramaDigitadoDTO): Promise<CronogramaItem[]> {
    await this.garantirAjuste(ajusteId);

    const itens: DadosCronogramaItem[] = [];
    for (const linha of input.itens ?? []) {
      const categoria = linha.categoria?.trim() ?? '';
      const subcategoria = linha.subcategoria?.trim() ?? '';
      if (!categoria || !subcategoria) continue;
      if (!ehRubricaPadrao(categoria, subcategoria))
        throw new BusinessError(`Rubrica fora do padrão: ${categoria} / ${subcategoria}.`);

      const ano = Number(linha.ano);
      const mes = Number(linha.mes);
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100)
        throw new BusinessError(`Exercício inválido em ${subcategoria}.`);
      if (!Number.isInteger(mes) || mes < 1 || mes > 12)
        throw new BusinessError(`Mês inválido em ${subcategoria}.`);

      const valor = linha.valor === undefined || linha.valor === null || linha.valor === '' ? 0 : Number(linha.valor);
      if (!Number.isFinite(valor) || valor < 0)
        throw new BusinessError(`Valor inválido em ${subcategoria} (${mes}/${ano}).`);

      // Mês zerado não é gravado: o quadro tem uma célula para cada rubrica em
      // cada mês, e a maioria fica vazia. Gravar zeros multiplicaria as linhas
      // sem acrescentar informação — e o cronograma já é o bloco mais numeroso.
      if (valor === 0) continue;

      itens.push({ categoria, subcategoria, ano, mes, valor });
    }

    if (!itens.length)
      throw new BusinessError('Informe ao menos um valor no cronograma.');

    return this.repo.substituir(ajusteId, itens);
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

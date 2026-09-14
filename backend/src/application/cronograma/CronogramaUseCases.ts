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
   * **Substitui os exercícios que vierem no lote**, não o cronograma inteiro:
   * a vigência pode atravessar anos, e o quadro digitado traz todos os meses
   * que ele mostra. Mesclar dentro do exercício deixaria meses de uma versão
   * anterior pendurados — num cronograma isso aparece como dinheiro previsto
   * duas vezes.
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

    // Um lote pode cobrir mais de um exercício (vigência que atravessa o ano).
    // Substitui-se cada um deles, e só eles.
    const anos = [...new Set(itens.map((i) => i.ano))];
    let saida = await this.repo.listarPorAjuste(ajusteId);
    for (const ano of anos) {
      saida = await this.repo.substituirAno(
        ajusteId,
        ano,
        itens.filter((i) => i.ano === ano),
      );
    }
    return saida;
  }

  /**
   * Copia o cronograma de um exercício para outro, com reajuste opcional.
   *
   * Mesma razão do plano: a parceria se renova e o desenho dos desembolsos
   * repete — 13º em dezembro, rescisões no mesmo mês. Redigitar 40 rubricas ×
   * 12 meses é 480 células.
   */
  async copiarExercicio(
    ajusteId: string,
    input: {
      de?: number | string;
      para?: number | string;
      reajustePercentual?: number | string | null;
      /** Aditivo que está replicando o cronograma — ver o caso de uso do plano. */
      termoAditivoId?: string | null;
    },
  ): Promise<CronogramaItem[]> {
    await this.garantirAjuste(ajusteId);

    const de = Number(input.de);
    const para = Number(input.para);
    if (!Number.isInteger(de) || !Number.isInteger(para))
      throw new BusinessError('Informe os exercícios de origem e destino.');
    if (de === para)
      throw new BusinessError('O exercício de destino precisa ser diferente do de origem.');

    const reajuste =
      input.reajustePercentual === undefined ||
      input.reajustePercentual === null ||
      input.reajustePercentual === ''
        ? 0
        : Number(input.reajustePercentual);
    if (!Number.isFinite(reajuste) || reajuste <= -100 || reajuste > 1000)
      throw new BusinessError('Percentual de reajuste inválido.');

    const origem = (await this.repo.listarPorAjuste(ajusteId)).filter((i) => i.ano === de);
    if (!origem.length)
      throw new BusinessError(`Não há cronograma cadastrado no exercício ${de}.`);

    const fator = 1 + reajuste / 100;
    const termoAditivoId = input.termoAditivoId?.trim() || null;
    const itens: DadosCronogramaItem[] = origem.map((i) => ({
      termoAditivoId,
      categoria: i.categoria,
      subcategoria: i.subcategoria,
      ano: para,
      mes: i.mes,
      valor: Math.round(i.valor * fator * 100) / 100,
    }));

    return this.repo.substituirAno(ajusteId, para, itens);
  }

  async exercicios(ajusteId: string): Promise<number[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.exercicios(ajusteId);
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

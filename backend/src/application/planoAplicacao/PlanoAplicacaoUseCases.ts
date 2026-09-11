import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';
import type { IPlanoAplicacaoRepository } from './IPlanoAplicacaoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosPlanoItem, PlanoDigitadoDTO, ResultadoImportacaoPlano } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { ehRubricaPadrao } from '@/core/planoAplicacao/planoPadrao';
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

  /**
   * Grava o plano digitado na tela.
   *
   * A tela informa **um valor mensal por rubrica**, como no papel, e aqui ele
   * vira as 12 linhas do exercício — que é o formato que o resto do sistema já
   * consome (o documento fiscal escolhe a rubrica do plano; o relatório soma
   * por mês). Expandir aqui, e não no cliente, mantém a regra "anual = mensal
   * × 12" num lugar só.
   *
   * **Substitui o plano inteiro**, como a importação de CSV faz. Plano de
   * aplicação é um documento, não uma lista que cresce: mesclar o digitado com
   * o que já estava deixaria rubricas órfãs de uma versão anterior, sem que
   * ninguém percebesse.
   */
  async salvarDigitado(ajusteId: string, input: PlanoDigitadoDTO): Promise<PlanoAplicacaoItem[]> {
    await this.garantirAjuste(ajusteId);

    const ano = Number(input.ano);
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100)
      throw new BusinessError('Informe o exercício do plano de aplicação.');

    const itens: DadosPlanoItem[] = [];
    for (const linha of input.itens ?? []) {
      const categoria = linha.categoria?.trim() ?? '';
      const subcategoria = linha.subcategoria?.trim() ?? '';
      if (!categoria || !subcategoria) continue;

      // A rubrica tem de ser do padrão. Sem isto, "padrão" valeria só enquanto
      // alguém usasse o formulário — e uma requisição direta o furaria.
      if (!ehRubricaPadrao(categoria, subcategoria))
        throw new BusinessError(`Rubrica fora do padrão: ${categoria} / ${subcategoria}.`);

      const bruto = linha.valorMensal;
      const mensal =
        bruto === undefined || bruto === null || bruto === '' ? 0 : Number(bruto);
      if (!Number.isFinite(mensal) || mensal < 0)
        throw new BusinessError(`Valor inválido em ${subcategoria}.`);

      // Rubrica zerada não vira 12 linhas de zero: o modelo do papel traz o
      // quadro inteiro, e gravar o que não se gasta encheria o plano de ruído
      // que depois aparece em toda tela que o lê.
      if (mensal === 0) continue;

      for (let mes = 1; mes <= 12; mes++) {
        itens.push({
          categoria,
          subcategoria,
          ano,
          mes,
          valor: mensal,
          descricao: linha.descricao?.trim() || null,
        });
      }
    }

    if (!itens.length)
      throw new BusinessError('Informe ao menos uma rubrica com valor maior que zero.');

    return this.repo.substituir(ajusteId, itens);
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

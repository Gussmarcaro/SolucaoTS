import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';
import type { IPlanoAplicacaoRepository } from './IPlanoAplicacaoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosPlanoItem, PlanoDigitadoDTO, ResultadoImportacaoPlano } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { ehRubricaPadrao } from '@/core/planoAplicacao/planoPadrao';
import { CATEGORIA_DESPESA_CODIGOS } from '@/core/dominio/tabelasFaseV';
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
   * **Substitui o exercício**, não o plano inteiro. Dentro do ano é documento,
   * não lista que cresce — mesclar deixaria rubricas órfãs de uma versão
   * anterior. Mas entre anos é acervo: a parceria dura anos, e salvar 2027 não
   * pode apagar 2026, cujo exercício já foi prestado e cuja execução ainda se
   * consulta.
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

      /*
       * A Categoria de Despesa AUDESP é o elo com a execução.
       *
       * O plano do ajuste é enviado ao Audesp com estas categorias, e a
       * prestação tem de trazer as mesmas despesas. É por este código que uma
       * nota fiscal se reconhece como prevista no plano — a rubrica interna
       * ("Salários") o Tribunal não conhece.
       *
       * Conferida contra a tabela oficial: código inventado seria recusado no
       * envio do plano, e o erro apareceria no Tribunal, não aqui.
       */
      const cat =
        linha.categoriaDespesaTipo === undefined ||
        linha.categoriaDespesaTipo === null ||
        linha.categoriaDespesaTipo === ''
          ? null
          : Number(linha.categoriaDespesaTipo);
      if (cat !== null && !CATEGORIA_DESPESA_CODIGOS.has(cat))
        throw new BusinessError(`Categoria de Despesa AUDESP inexistente em ${subcategoria}: ${cat}.`);

      for (let mes = 1; mes <= 12; mes++) {
        itens.push({
          categoria,
          subcategoria,
          categoriaDespesaTipo: cat,
          ano,
          mes,
          valor: mensal,
          descricao: linha.descricao?.trim() || null,
        });
      }
    }

    if (!itens.length)
      throw new BusinessError('Informe ao menos uma rubrica com valor maior que zero.');

    return this.repo.substituirAno(ajusteId, ano, itens);
  }

  /**
   * Copia o plano de um exercício para outro, com reajuste opcional.
   *
   * Parceria se renova todo ano e o plano muda pouco: reajuste aqui, rubrica
   * nova ali. Redigitar 40 rubricas é o tipo de trabalho que faz alguém voltar
   * para a planilha — e um sistema que dá mais trabalho que a planilha perde
   * para ela.
   *
   * O reajuste é aplicado sobre o **mensal**, e o arredondamento é por rubrica,
   * em duas casas: é o número que a pessoa vai ver e conferir na tela.
   */
  async copiarExercicio(
    ajusteId: string,
    input: {
      de?: number | string;
      para?: number | string;
      reajustePercentual?: number | string | null;
      /**
       * Aditivo que está replicando o plano.
       *
       * A norma manda o aditivo replicar Plano e Cronograma, e a razão é
       * prática: prorrogar para 2028 cria um exercício que o plano não tinha.
       * Guardar quem o criou é o que permite responder, meses depois, por qual
       * instrumento aquele exercício foi pactuado — pergunta que a fiscalização
       * faz e que "apareceu do nada" não responde.
       */
      termoAditivoId?: string | null;
    },
  ): Promise<PlanoAplicacaoItem[]> {
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
      throw new BusinessError(`Não há plano cadastrado no exercício ${de}.`);

    const fator = 1 + reajuste / 100;
    const termoAditivoId = input.termoAditivoId?.trim() || null;
    const itens: DadosPlanoItem[] = origem.map((i) => ({
      termoAditivoId,
      categoria: i.categoria,
      subcategoria: i.subcategoria,
      categoriaDespesaTipo: i.categoriaDespesaTipo,
      ano: para,
      mes: i.mes,
      valor: Math.round(i.valor * fator * 100) / 100,
      descricao: i.descricao,
    }));

    return this.repo.substituirAno(ajusteId, para, itens);
  }

  /** Exercícios já cadastrados — a origem possível da cópia. */
  async exercicios(ajusteId: string): Promise<number[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.exercicios(ajusteId);
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

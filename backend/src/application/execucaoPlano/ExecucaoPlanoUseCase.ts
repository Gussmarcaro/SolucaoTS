import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { IExecucaoPlanoRepository } from './IExecucaoPlanoRepository';
import type { ExecucaoPlano, LinhaExecucaoPlano } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Execução × Plano — quanto de cada categoria já foi gasto.
 *
 * É a pergunta que o órgão e a Comissão de Fiscalização fazem o ano inteiro, e
 * que hoje se responde no Excel: *sobrou quanto em Salários?*, *a manutenção
 * predial estourou?*. Os dois lados já estavam no sistema — o plano declara por
 * Categoria AUDESP, a nota fiscal cita uma — e faltava cruzá-los.
 *
 * O ponto não é o relatório: é **pegar o estouro de rubrica antes do
 * Tribunal**. Depois de transmitida a prestação, corrigir custa apontamento; um
 * ano antes, custa um termo aditivo.
 */
export class ExecucaoPlanoUseCase {
  constructor(
    private readonly repo: IExecucaoPlanoRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  async execute(ajusteId: string, ano: number): Promise<ExecucaoPlano> {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100)
      throw new BusinessError('Exercício inválido.');

    const [planejado, executado] = await Promise.all([
      this.repo.planejadoPorCategoria(ajusteId, ano),
      this.repo.executadoPorCategoria(ajusteId, ano),
    ]);

    /*
     * A união das duas listas, e não só o plano.
     *
     * Categoria executada que o plano não prevê **tem** de aparecer: é a
     * irregularidade que a regra do plano existe para impedir, e ela existe nos
     * ajustes antigos, cujo plano não tem categorias e por isso não trava o
     * lançamento. Mostrar só o plano esconderia justamente o que se procura.
     */
    const porCategoria = new Map<number, LinhaExecucaoPlano>();

    for (const p of planejado) {
      porCategoria.set(p.categoriaDespesaTipo, {
        categoriaDespesaTipo: p.categoriaDespesaTipo,
        rubricas: p.rubricas,
        planejado: p.valor,
        executado: 0,
      });
    }

    for (const e of executado) {
      const linha = porCategoria.get(e.categoriaDespesaTipo);
      if (linha) linha.executado = e.valor;
      else
        porCategoria.set(e.categoriaDespesaTipo, {
          categoriaDespesaTipo: e.categoriaDespesaTipo,
          rubricas: [],
          planejado: 0,
          executado: e.valor,
        });
    }

    // Ordem: o que estourou primeiro, depois o que mais consumiu. Quem abre
    // este quadro está procurando problema — e problema tem de estar no topo,
    // não em ordem de código, que não diz nada a ninguém.
    const linhas = [...porCategoria.values()].sort((a, b) => {
      const estourouA = a.executado > a.planejado ? 1 : 0;
      const estourouB = b.executado > b.planejado ? 1 : 0;
      if (estourouA !== estourouB) return estourouB - estourouA;
      return b.executado - a.executado;
    });

    return {
      ajusteId,
      ano,
      linhas,
      temGastoForaDoPlano: linhas.some((l) => l.planejado === 0 && l.executado > 0),
    };
  }
}

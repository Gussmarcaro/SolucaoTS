import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IPlanoAplicacaoRepository } from '@/application/planoAplicacao/IPlanoAplicacaoRepository';
import type { DadosPlanoItem } from '@/application/planoAplicacao/dtos';
import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';

const selecao = {
  id: true,
  ajusteId: true,
  termoAditivoId: true,
  categoria: true,
  subcategoria: true,
  categoriaDespesaTipo: true,
  ano: true,
  mes: true,
  valor: true,
  descricao: true,
} satisfies Prisma.PlanoAplicacaoItemSelect;

type Row = Prisma.PlanoAplicacaoItemGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): PlanoAplicacaoItem {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    termoAditivoId: row.termoAditivoId,
    categoria: row.categoria,
    subcategoria: row.subcategoria,
    categoriaDespesaTipo: row.categoriaDespesaTipo,
    ano: row.ano,
    mes: row.mes,
    valor: Number(row.valor),
    descricao: row.descricao,
  };
}

const ordem: Prisma.PlanoAplicacaoItemOrderByWithRelationInput[] = [
  { categoria: 'asc' },
  { subcategoria: 'asc' },
  { ano: 'asc' },
  { mes: 'asc' },
];

export class PrismaPlanoAplicacaoRepository implements IPlanoAplicacaoRepository {
  async listarPorAjuste(ajusteId: string): Promise<PlanoAplicacaoItem[]> {
    const rows = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: ordem,
    });
    return rows.map(toDomain);
  }

  /** Só os códigos, distintos — ver a razão no port. */
  async categoriasDoAjuste(ajusteId: string): Promise<number[]> {
    const linhas = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId, categoriaDespesaTipo: { not: null } },
      select: { categoriaDespesaTipo: true },
      distinct: ['categoriaDespesaTipo'],
    });
    return linhas.map((l) => l.categoriaDespesaTipo!).sort((a, b) => a - b);
  }

  /**
   * As rubricas de todos os planos do órgão, sem repetição.
   *
   * **Parte dos ajustes, e não direto do `planoAplicacaoItem`.** O item do
   * plano é filho do ajuste, e a extension de tenant só recorta as raízes —
   * uma consulta direta traria as rubricas de todos os órgãos. É o mesmo
   * cuidado dos relatórios: pega-se os ajustes (filtrados) e só então os
   * filhos deles.
   */
  async rubricasDoOrgao(): Promise<{ categoria: string; subcategoria: string }[]> {
    const ajustes = await prisma.ajuste.findMany({ select: { id: true } });
    if (!ajustes.length) return [];

    const linhas = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId: { in: ajustes.map((a) => a.id) } },
      select: { categoria: true, subcategoria: true },
      distinct: ['categoria', 'subcategoria'],
      orderBy: [{ categoria: 'asc' }, { subcategoria: 'asc' }],
    });
    return linhas;
  }

  async substituir(ajusteId: string, itens: DadosPlanoItem[]): Promise<PlanoAplicacaoItem[]> {
    return prisma.$transaction(async (tx) => {
      await tx.planoAplicacaoItem.deleteMany({ where: { ajusteId } });
      if (itens.length) {
        await tx.planoAplicacaoItem.createMany({
          data: itens.map((i) => ({ ajusteId, ...i })),
        });
      }
      const rows = await tx.planoAplicacaoItem.findMany({
        where: { ajusteId },
        select: selecao,
        orderBy: ordem,
      });
      return rows.map(toDomain);
    });
  }

  /**
   * Substitui só o exercício, preservando os demais.
   *
   * Numa transação, como a substituição total: apagar e recriar em duas idas
   * deixaria uma janela em que o exercício está vazio — e é a janela em que
   * alguém abre a tela e conclui que perdeu o trabalho.
   */
  async substituirAno(ajusteId: string, ano: number, itens: DadosPlanoItem[]) {
    return prisma.$transaction(async (tx) => {
      await tx.planoAplicacaoItem.deleteMany({ where: { ajusteId, ano } });
      if (itens.length) {
        await tx.planoAplicacaoItem.createMany({ data: itens.map((i) => ({ ajusteId, ...i })) });
      }
      const rows = await tx.planoAplicacaoItem.findMany({ where: { ajusteId }, select: selecao, orderBy: ordem });
      return rows.map(toDomain);
    });
  }

  async exercicios(ajusteId: string): Promise<number[]> {
    const linhas = await prisma.planoAplicacaoItem.findMany({
      where: { ajusteId },
      select: { ano: true },
      distinct: ['ano'],
      orderBy: { ano: 'desc' },
    });
    return linhas.map((l) => l.ano);
  }
}

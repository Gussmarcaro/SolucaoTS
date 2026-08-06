import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IBemAjusteRepository } from '@/application/bemAjuste/IBemAjusteRepository';
import type { DadosBemAjuste } from '@/application/bemAjuste/dtos';
import type { BemAjuste } from '@/core/bemAjuste/BemAjuste';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  ajusteId: true,
  identificador: true,
  data: true,
  valor: true,
  codigo: true,
} satisfies Prisma.BemCedidoCadastroSelect;

type Row = Prisma.BemCedidoCadastroGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): BemAjuste {
  return {
    id: row.id,
    ajusteId: row.ajusteId,
    identificador: row.identificador,
    data: paraDataISO(row.data),
    valor: Number(row.valor),
    codigo: row.codigo,
  };
}

const ordem: Prisma.BemCedidoCadastroOrderByWithRelationInput[] = [{ data: 'asc' }, { identificador: 'asc' }];

export class PrismaBemAjusteRepository implements IBemAjusteRepository {
  async listarPorAjuste(ajusteId: string): Promise<BemAjuste[]> {
    const rows = await prisma.bemCedidoCadastro.findMany({
      where: { ajusteId },
      select: selecao,
      orderBy: ordem,
    });
    return rows.map(toDomain);
  }

  async substituir(ajusteId: string, itens: DadosBemAjuste[]): Promise<BemAjuste[]> {
    return prisma.$transaction(async (tx) => {
      await tx.bemCedidoCadastro.deleteMany({ where: { ajusteId } });
      if (itens.length) {
        await tx.bemCedidoCadastro.createMany({ data: itens.map((i) => ({ ajusteId, ...i })) });
      }
      const rows = await tx.bemCedidoCadastro.findMany({
        where: { ajusteId },
        select: selecao,
        orderBy: ordem,
      });
      return rows.map(toDomain);
    });
  }
}

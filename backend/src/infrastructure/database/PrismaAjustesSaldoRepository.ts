import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IAjustesSaldoRepository } from '@/application/ajustesSaldo/IAjustesSaldoRepository';
import type {
  AjustesSaldo,
  InclusaoPagamento,
  InclusaoRepasse,
  RetificacaoPagamento,
  RetificacaoRepasse,
} from '@/application/ajustesSaldo/dtos';

const J = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export class PrismaAjustesSaldoRepository implements IAjustesSaldoRepository {
  async obter(prestacaoId: string): Promise<AjustesSaldo | null> {
    const r = await prisma.ajustesSaldo.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      retificacaoRepasses: (r.retificacaoRepasses as unknown as RetificacaoRepasse[]) ?? [],
      inclusaoRepasses: (r.inclusaoRepasses as unknown as InclusaoRepasse[]) ?? [],
      retificacaoPagamentos: (r.retificacaoPagamentos as unknown as RetificacaoPagamento[]) ?? [],
      inclusaoPagamentos: (r.inclusaoPagamentos as unknown as InclusaoPagamento[]) ?? [],
    };
  }

  async salvar(prestacaoId: string, dados: Omit<AjustesSaldo, 'prestacaoId'>): Promise<AjustesSaldo> {
    const data = {
      retificacaoRepasses: J(dados.retificacaoRepasses),
      inclusaoRepasses: J(dados.inclusaoRepasses),
      retificacaoPagamentos: J(dados.retificacaoPagamentos),
      inclusaoPagamentos: J(dados.inclusaoPagamentos),
    };
    await prisma.ajustesSaldo.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }
}

import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type {
  EnvioRegistrado,
  ITransmissaoRepository,
  NovoEnvio,
  PrestacaoParaEnvio,
} from '@/application/transmissao/ITransmissaoRepository';
import type { Ambiente, Inconformidade } from '@/application/transmissao/dtos';

/** sha-256 do JSON como texto — o mesmo texto que foi no corpo do envio. */
export function impressaoDigital(documento: unknown): string {
  return createHash('sha256').update(JSON.stringify(documento)).digest('hex');
}

export class PrismaTransmissaoRepository implements ITransmissaoRepository {
  async carregar(prestacaoId: string): Promise<PrestacaoParaEnvio | null> {
    const p = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: {
        id: true,
        ajusteId: true,
        ano: true,
        status: true,
        declaracaoNegativa: true,
        ehRetificacao: true,
        ajuste: { select: { tipoAjuste: true } },
        _count: { select: { envios: { where: { ambiente: 'PRODUCAO' } } } },
      },
    });
    if (!p) return null;
    return {
      id: p.id,
      ajusteId: p.ajusteId,
      ano: p.ano,
      status: p.status,
      tipoAjuste: p.ajuste?.tipoAjuste ?? '',
      declaracaoNegativa: p.declaracaoNegativa,
      ehRetificacao: p.ehRetificacao,
      enviadaProducao: p._count.envios > 0,
    };
  }

  async registrarEnvio(prestacaoId: string, envio: NovoEnvio): Promise<void> {
    await prisma.$transaction([
      prisma.prestacaoEnvio.create({
        data: {
          prestacaoId,
          ambiente: envio.ambiente,
          protocolo: envio.protocolo,
          retificacao: envio.retificacao,
          hash: impressaoDigital(envio.documento),
          documento: envio.documento as Prisma.InputJsonValue,
        },
      }),
      prisma.prestacaoContas.update({
        where: { id: prestacaoId },
        data: { protocolo: envio.protocolo, status: 'ENVIADO', dataEnvio: new Date(), inconformidades: undefined },
      }),
    ]);
  }

  async registrarStatus(
    prestacaoId: string,
    status: 'ARMAZENADO' | 'REJEITADO' | 'SUBSTITUIDO' | 'EXCLUIDO' | 'ENVIADO',
    inconformidades: Inconformidade[],
  ): Promise<void> {
    await prisma.prestacaoContas.update({
      where: { id: prestacaoId },
      data: { status, inconformidades: inconformidades.length ? (inconformidades as unknown as object) : undefined },
    });
  }

  async posterioresArmazenadas(ajusteId: string, ano: number): Promise<number[]> {
    const linhas = await prisma.prestacaoContas.findMany({
      where: { ajusteId, ano: { gt: ano }, status: 'ARMAZENADO' },
      select: { ano: true },
      orderBy: { ano: 'asc' },
    });
    return linhas.map((l) => l.ano);
  }

  async reabrir(prestacaoId: string, marcas: { ehRetificacao: boolean; declaracaoNegativa: boolean }): Promise<void> {
    await prisma.prestacaoContas.update({
      where: { id: prestacaoId },
      data: { status: 'EM_ELABORACAO', inconformidades: undefined, ...marcas },
    });
  }

  async envios(prestacaoId: string): Promise<EnvioRegistrado[]> {
    const linhas = await prisma.prestacaoEnvio.findMany({
      where: { prestacaoId },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, ambiente: true, protocolo: true, retificacao: true, hash: true, criadoEm: true, criadoPor: true },
    });
    const ids = [...new Set(linhas.map((l) => l.criadoPor).filter((x): x is string => !!x))];
    const nomes = new Map(
      (await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } })).map((u) => [u.id, u.nome]),
    );
    return linhas.map((l) => ({
      id: l.id,
      ambiente: l.ambiente as Ambiente,
      protocolo: l.protocolo,
      retificacao: l.retificacao,
      hash: l.hash,
      criadoEm: l.criadoEm.toISOString(),
      criadoPorNome: l.criadoPor ? (nomes.get(l.criadoPor) ?? null) : null,
    }));
  }

  async documentoEnviado(prestacaoId: string, envioId: string) {
    const e = await prisma.prestacaoEnvio.findFirst({
      where: { id: envioId, prestacaoId },
      select: { documento: true, hash: true, protocolo: true },
    });
    return e ? { documento: e.documento as unknown, hash: e.hash, protocolo: e.protocolo } : null;
  }
}

/** Para a trava das rotas: a prestação está travada para edição? */
export async function prestacaoTravada(prestacaoId: string): Promise<boolean> {
  const p = await prisma.prestacaoContas.findUnique({
    where: { id: prestacaoId },
    select: { status: true, _count: { select: { envios: { where: { ambiente: 'PRODUCAO' } } } } },
  });
  return !!p && p._count.envios > 0 && (p.status === 'ENVIADO' || p.status === 'ARMAZENADO');
}

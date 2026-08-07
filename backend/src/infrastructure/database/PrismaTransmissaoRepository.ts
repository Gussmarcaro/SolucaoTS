import { prisma } from './prisma';
import type { ITransmissaoRepository, PrestacaoParaEnvio } from '@/application/transmissao/ITransmissaoRepository';
import type { Inconformidade } from '@/application/transmissao/dtos';

export class PrismaTransmissaoRepository implements ITransmissaoRepository {
  async carregar(prestacaoId: string): Promise<PrestacaoParaEnvio | null> {
    const p = await prisma.prestacaoContas.findUnique({
      where: { id: prestacaoId },
      select: { id: true, status: true, ajuste: { select: { tipoAjuste: true } } },
    });
    if (!p) return null;
    return { id: p.id, status: p.status, tipoAjuste: p.ajuste?.tipoAjuste ?? '' };
  }

  async registrarEnvio(prestacaoId: string, protocolo: string): Promise<void> {
    await prisma.prestacaoContas.update({
      where: { id: prestacaoId },
      data: { protocolo, status: 'ENVIADO', dataEnvio: new Date(), inconformidades: undefined },
    });
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
}

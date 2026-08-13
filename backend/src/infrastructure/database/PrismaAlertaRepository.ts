import { prisma } from './prisma';
import { paraDataISO } from '@/shared/datas';
import type { DadosAlertas, IAlertaRepository } from '@/application/alerta/ListarAlertasUseCase';

const iso = (d: Date) => paraDataISO(d);

/**
 * Coleta o que alimenta os alertas, sem decidir nada.
 *
 * Cada consulta traz só o necessário e já vem recortada por data — o sino é
 * consultado a cada carregamento de tela, então não pode varrer o histórico
 * inteiro. Quem transforma isso em prazo e urgência é o caso de uso.
 */
export class PrismaAlertaRepository implements IAlertaRepository {
  async coletar(desde: string): Promise<DadosAlertas> {
    const limite = new Date(`${desde}T00:00:00.000Z`);
    // Certidões: olha para trás (vencidas há pouco) e um pouco para a frente.
    const horizonte = new Date();
    horizonte.setUTCDate(horizonte.getUTCDate() + 30);

    const [rejeitadas, docs, certidoesAjuste, ajustes, aditivos, orgaos, comArmazenada, totalAjustes] =
      await Promise.all([
        prisma.prestacaoContas.findMany({
          where: { status: 'REJEITADO' },
          select: { id: true, ano: true, ajuste: { select: { codigoAjuste: true, entidadeBeneficiaria: { select: { razaoSocial: true } } } } },
          take: 20,
        }),
        prisma.documentoRegularidade.findMany({
          where: { dataVencimento: { not: null, gte: limite, lte: horizonte } },
          select: {
            id: true,
            tipo: true,
            arquivoNome: true,
            dataVencimento: true,
            entidade: { select: { razaoSocial: true } },
          },
          take: 50,
        }),
        prisma.certidao.findMany({
          where: { concluida: false, vigenciaFinal: { not: null, gte: limite, lte: horizonte } },
          select: {
            id: true,
            tipo: true,
            descricao: true,
            vigenciaFinal: true,
            entidadeBeneficiaria: { select: { razaoSocial: true } },
          },
          take: 50,
        }),
        prisma.ajuste.findMany({
          where: { dataAssinatura: { gte: limite } },
          select: {
            id: true,
            codigoAjuste: true,
            dataAssinatura: true,
            entidadeBeneficiaria: { select: { razaoSocial: true } },
          },
          take: 50,
        }),
        prisma.termoAditivo.findMany({
          where: { dataAssinatura: { gte: limite } },
          select: {
            id: true,
            numero: true,
            dataAssinatura: true,
            ajuste: { select: { id: true, codigoAjuste: true } },
          },
          take: 50,
        }),
        prisma.cliente.findMany({
          where: { ativo: true },
          select: { id: true, nome: true, periodicidade: true },
        }),
        // Ajustes que já têm prestação aceita — o complemento é o que falta.
        prisma.prestacaoContas.findMany({
          where: { status: 'ARMAZENADO' },
          select: { ajusteId: true },
          distinct: ['ajusteId'],
        }),
        prisma.ajuste.count(),
      ]);

    return {
      prestacoesRejeitadas: rejeitadas.map((p) => ({
        id: p.id,
        ano: p.ano,
        ajusteCodigo: p.ajuste.codigoAjuste,
        entidadeNome: p.ajuste.entidadeBeneficiaria.razaoSocial,
      })),
      certidoes: [
        ...docs.map((d) => ({
          id: d.id,
          descricao: d.arquivoNome?.trim() || d.tipo.replace(/_/g, ' ').toLowerCase(),
          vencimento: iso(d.dataVencimento as Date),
          onde: d.entidade.razaoSocial,
        })),
        ...certidoesAjuste.map((c) => ({
          id: c.id,
          descricao: c.descricao?.trim() || c.tipo,
          vencimento: iso(c.vigenciaFinal as Date),
          onde: c.entidadeBeneficiaria?.razaoSocial ?? 'Certidão do ajuste',
        })),
      ],
      ajustesRecentes: ajustes.map((a) => ({
        id: a.id,
        codigoAjuste: a.codigoAjuste,
        dataAssinatura: iso(a.dataAssinatura),
        entidadeNome: a.entidadeBeneficiaria.razaoSocial,
      })),
      aditivosRecentes: aditivos.map((t) => ({
        id: t.id,
        numero: t.numero,
        ajusteId: t.ajuste.id,
        ajusteCodigo: t.ajuste.codigoAjuste,
        dataAssinatura: iso(t.dataAssinatura),
      })),
      orgaos: orgaos.map((o) => ({ id: o.id, nome: o.nome, periodicidade: o.periodicidade })),
      ajustesSemPrestacao: Math.max(0, totalAjustes - comArmazenada.length),
    };
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { expandirRecorrencia } from '@/core/compromisso/Compromisso';
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
/** Até quando um lembrete continua no sino depois de a reunião começar. */
const MINUTOS_APOS_INICIO = 0;

export class PrismaAlertaRepository implements IAlertaRepository {
  async coletar(
    desde: string,
    espectador: { usuarioId: string; grupoId: string | null },
  ): Promise<DadosAlertas> {
    const limite = new Date(`${desde}T00:00:00.000Z`);
    // Certidões: olha para trás (vencidas há pouco) e um pouco para a frente.
    const horizonte = new Date();
    horizonte.setUTCDate(horizonte.getUTCDate() + 30);

    const [rejeitadas, docs, certidoesAjuste, ajustes, aditivos, orgaos, comArmazenada, totalAjustes, tarefas] =
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
        // Tarefas nascidas de alerta. Canceladas ficam de fora: quem cancelou
        // descartou aquela providência, e o prazo volta a cobrar sozinho.
        prisma.tarefa.findMany({
          where: { origemAlerta: { not: null }, status: { not: 'CANCELADA' } },
          select: { id: true, origemAlerta: true, status: true },
          take: 500,
        }),
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
      tarefasDeAlerta: tarefas.map((t) => ({ id: t.id, origemAlerta: t.origemAlerta as string, status: t.status })),
      lembretes: await this.lembretes(espectador),
    };
  }
  /**
   * Lembretes de compromisso que já chegaram a hora de avisar.
   *
   * Dois cuidados: a **visibilidade da agenda** vale igual aqui — o sino não
   * pode ser a porta dos fundos para a agenda particular de um colega — e a
   * janela é curta, porque lembrete é coisa de minutos.
   *
   * A recorrência é expandida como na agenda: uma reunião semanal precisa
   * avisar toda semana, não só na primeira.
   */
  private async lembretes(espectador: { usuarioId: string; grupoId: string | null }) {
    const agora = new Date();
    // A maior antecedência configurável decide o quão longe olhar à frente.
    const horizonte = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

    const visivel: Prisma.CompromissoWhereInput = {
      OR: [
        { criadoPor: espectador.usuarioId },
        { visibilidade: 'ORGAO' },
        { visibilidade: 'RESTRITO', participantes: { some: { usuarioId: espectador.usuarioId } } },
        ...(espectador.grupoId
          ? [
              {
                visibilidade: 'RESTRITO' as const,
                grupos: { some: { grupoId: espectador.grupoId } },
              },
            ]
          : []),
      ],
    };

    const linhas = await prisma.compromisso.findMany({
      where: {
        AND: [
          visivel,
          { status: 'AGENDADO', alertas: { some: {} } },
          {
            OR: [
              { recorrencia: 'NAO_REPETE', inicioEm: { gte: agora, lte: horizonte } },
              {
                recorrencia: { not: 'NAO_REPETE' },
                inicioEm: { lte: horizonte },
                OR: [{ recorrenciaAte: null }, { recorrenciaAte: { gte: agora } }],
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        titulo: true,
        local: true,
        inicioEm: true,
        fimEm: true,
        recorrencia: true,
        recorrenciaIntervalo: true,
        recorrenciaAte: true,
        alertas: { select: { minutosAntes: true } },
      },
      take: 100,
    });

    const saida: DadosAlertas['lembretes'] = [];
    for (const c of linhas) {
      const ocorrencias = expandirRecorrencia(c, { de: agora, ate: horizonte });
      // Só a próxima ocorrência interessa: avisar de todas as repetições
      // futuras encheria o sino com a mesma reunião dezenas de vezes.
      const proxima = ocorrencias[0] ?? { inicioEm: c.inicioEm };
      for (const a of c.alertas) {
        const avisarA = new Date(proxima.inicioEm.getTime() - a.minutosAntes * 60_000);
        const some = new Date(proxima.inicioEm.getTime() + MINUTOS_APOS_INICIO * 60_000);
        if (agora >= avisarA && agora <= some) {
          saida.push({
            compromissoId: c.id,
            titulo: c.titulo,
            inicioEm: proxima.inicioEm.toISOString(),
            local: c.local,
            minutosAntes: a.minutosAntes,
          });
        }
      }
    }
    return saida;
  }
}

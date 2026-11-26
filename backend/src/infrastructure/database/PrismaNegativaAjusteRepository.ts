import type {
  INegativaAjusteRepository,
  NegativaGravada,
} from '@/application/declaracaoNegativa/NegativaAjusteUseCases';
import type { AjusteAssinado, Periodicidade, TipoAjuste } from '@/core/declaracaoNegativa/negativaAjustes';
import type { AjusteParaNegativa } from '@/core/declaracaoNegativa/negativaPrestacao';
import { prisma } from './prisma';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * `clienteId` explícito em toda consulta, além do recorte automático: a regra
 * inteira é "deste órgão", e o Suporte sem órgão selecionado não pode cair
 * num filtro vazio.
 */
export class PrismaNegativaAjusteRepository implements INegativaAjusteRepository {
  async periodicidade(clienteId: string): Promise<Periodicidade | null> {
    const c = await prisma.cliente.findFirst({ where: { id: clienteId }, select: { periodicidade: true } });
    return (c?.periodicidade as Periodicidade | undefined) ?? null;
  }

  async ajustesAssinados(clienteId: string, de: string, ate: string): Promise<AjusteAssinado[]> {
    const linhas = await prisma.ajuste.findMany({
      where: {
        clienteId,
        dataAssinatura: { gte: new Date(`${de}T00:00:00Z`), lte: new Date(`${ate}T00:00:00Z`) },
      },
      select: { tipoAjuste: true, codigoAjuste: true, dataAssinatura: true, status: true },
    });
    return linhas.map((a) => ({
      tipoAjuste: a.tipoAjuste as TipoAjuste,
      codigoAjuste: a.codigoAjuste,
      dataAssinatura: iso(a.dataAssinatura),
      enviado: a.status === 'ENVIADO',
    }));
  }

  async declaradas(clienteId: string, ano: number): Promise<NegativaGravada[]> {
    const linhas = await prisma.negativaAjuste.findMany({
      where: { clienteId, ano },
      select: { id: true, periodo: true, tipoAjuste: true, declaradaEm: true },
    });
    return linhas.map((n) => ({
      id: n.id,
      periodo: n.periodo,
      tipoAjuste: n.tipoAjuste as TipoAjuste,
      declaradaEm: iso(n.declaradaEm),
    }));
  }

  async marcar(clienteId: string, ano: number, periodo: number, tipos: TipoAjuste[], declaradaEm: Date) {
    // Um upsert por tipo, numa transação: marcar três tipos é um ato só.
    await prisma.$transaction(
      tipos.map((tipoAjuste) =>
        prisma.negativaAjuste.upsert({
          where: { clienteId_ano_periodo_tipoAjuste: { clienteId, ano, periodo, tipoAjuste } },
          create: { clienteId, ano, periodo, tipoAjuste, declaradaEm },
          update: { declaradaEm },
        }),
      ),
    );
  }

  async ajustesParaNegativa(clienteId: string, ano: number): Promise<AjusteParaNegativa[]> {
    const ajustes = await prisma.ajuste.findMany({
      where: { clienteId, dataAssinatura: { lte: new Date(`${ano}-12-31T00:00:00Z`) } },
      select: {
        id: true,
        codigoAjuste: true,
        tipoAjuste: true,
        dataAssinatura: true,
        vigenciaFinal: true,
        entidadeBeneficiaria: { select: { razaoSocial: true } },
        prestacoesContas: { select: { id: true, ano: true, status: true, declaracaoNegativa: true } },
        _count: { select: { empenhosCadastro: { where: { anoEmpenho: ano } } } },
      },
    });
    return ajustes.map((a) => {
      const comuns = a.prestacoesContas.filter((p) => !p.declaracaoNegativa);
      const negativa = a.prestacoesContas.find((p) => p.declaracaoNegativa && p.ano === ano);
      return {
        ajusteId: a.id,
        codigoAjuste: a.codigoAjuste,
        tipoAjuste: a.tipoAjuste,
        entidadeNome: a.entidadeBeneficiaria?.razaoSocial ?? '',
        dataAssinatura: iso(a.dataAssinatura),
        vigenciaFinal: a.vigenciaFinal ? iso(a.vigenciaFinal) : null,
        anosComPrestacao: comuns.map((p) => p.ano),
        negativaNoAno: negativa ? { prestacaoId: negativa.id, status: negativa.status } : null,
        prestacaoNoAnoId: comuns.find((p) => p.ano === ano)?.id ?? null,
        empenhosNoAno: a._count.empenhosCadastro,
      };
    });
  }

  async desmarcar(clienteId: string, id: string): Promise<boolean> {
    const r = await prisma.negativaAjuste.deleteMany({ where: { id, clienteId } });
    return r.count > 0;
  }
}

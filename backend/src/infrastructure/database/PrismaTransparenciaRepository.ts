import { prisma } from './prisma';
import { paraDataISO } from '@/shared/datas';
import type {
  ITransparenciaRepository,
  ParceriaPublicavel,
} from '@/application/transparencia/ListarTransparenciaUseCase';

const iso = (d: Date | null) => (d ? paraDataISO(d) : null);

export class PrismaTransparenciaRepository implements ITransparenciaRepository {
  async parcerias(): Promise<Omit<ParceriaPublicavel, 'pendencias'>[]> {
    const ajustes = await prisma.ajuste.findMany({
      select: {
        id: true,
        codigoAjuste: true,
        numero: true,
        tipoAjuste: true,
        objeto: true,
        valorGlobal: true,
        dataAssinatura: true,
        vigenciaInicial: true,
        vigenciaFinal: true,
        publicacaoLocal: true,
        publicacaoData: true,
        publicacaoLink: true,
        entidadeBeneficiaria: { select: { razaoSocial: true, cnpj: true } },
        cliente: { select: { nome: true } },
        // A prestação mais recente representa a situação atual da parceria —
        // é o que o art. 10 pede que se publique.
        prestacoesContas: {
          orderBy: { ano: 'desc' },
          take: 1,
          select: { status: true, ano: true },
        },
      },
      // Ordem de assinatura, decrescente: a lei pede a relação por data, e a
      // parceria recém-assinada é a que ainda não foi publicada.
      orderBy: { dataAssinatura: 'desc' },
    });

    return ajustes.map((a) => ({
      ajusteId: a.id,
      codigoAjuste: a.codigoAjuste,
      numero: a.numero,
      tipoAjuste: a.tipoAjuste,
      objeto: a.objeto,
      entidadeNome: a.entidadeBeneficiaria.razaoSocial,
      entidadeCnpj: a.entidadeBeneficiaria.cnpj,
      orgaoNome: a.cliente?.nome ?? null,
      valorGlobal: Number(a.valorGlobal),
      dataAssinatura: paraDataISO(a.dataAssinatura),
      vigenciaInicial: iso(a.vigenciaInicial),
      vigenciaFinal: iso(a.vigenciaFinal),
      publicacaoLocal: a.publicacaoLocal,
      publicacaoData: iso(a.publicacaoData),
      publicacaoLink: a.publicacaoLink,
      prestacaoStatus: a.prestacoesContas[0]?.status ?? null,
      prestacaoAno: a.prestacoesContas[0]?.ano ?? null,
    }));
  }
}

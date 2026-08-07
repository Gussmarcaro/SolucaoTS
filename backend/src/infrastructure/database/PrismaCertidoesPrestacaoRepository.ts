import { prisma } from './prisma';
import type { ICertidoesPrestacaoRepository } from '@/application/certidoesPrestacao/ICertidoesPrestacaoRepository';
import type { DadosGerais, DadosGeraisDTO, Responsaveis, ResponsaveisDTO } from '@/application/certidoesPrestacao/dtos';

export class PrismaCertidoesPrestacaoRepository implements ICertidoesPrestacaoRepository {
  async obterDadosGerais(prestacaoId: string): Promise<DadosGerais | null> {
    const r = await prisma.dadosGeraisBeneficiaria.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    const { id: _id, ...resto } = r;
    void _id;
    return resto;
  }

  async salvarDadosGerais(prestacaoId: string, dados: DadosGeraisDTO): Promise<DadosGerais> {
    const r = await prisma.dadosGeraisBeneficiaria.upsert({
      where: { prestacaoId },
      create: { prestacaoId, ...dados },
      update: dados,
    });
    const { id: _id, ...resto } = r;
    void _id;
    return resto;
  }

  async obterResponsaveis(prestacaoId: string): Promise<Responsaveis | null> {
    const r = await prisma.responsaveisConcessor.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    const { id: _id, ...resto } = r;
    void _id;
    return resto;
  }

  async salvarResponsaveis(prestacaoId: string, dados: ResponsaveisDTO): Promise<Responsaveis> {
    const r = await prisma.responsaveisConcessor.upsert({
      where: { prestacaoId },
      create: { prestacaoId, ...dados },
      update: dados,
    });
    const { id: _id, ...resto } = r;
    void _id;
    return resto;
  }
}

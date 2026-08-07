import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDeclaratoriosRepository } from '@/application/declaratorios/IDeclaratoriosRepository';
import type {
  Declaracoes,
  EmpresaPertencente,
  Participacao,
  Parecer,
  DeclaracaoAnalise,
  RequisitoAtende,
  Transparencia,
} from '@/application/declaratorios/dtos';

const J = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export class PrismaDeclaratoriosRepository implements IDeclaratoriosRepository {
  // ---- Declarações (24) ----
  async obterDeclaracoes(prestacaoId: string): Promise<Declaracoes | null> {
    const r = await prisma.declaracoesPrestacao.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      houveContratacao: r.houveContratacao,
      empresasPertencentes: (r.empresasPertencentes as unknown as EmpresaPertencente[]) ?? [],
      houveParticipacao: r.houveParticipacao,
      participacoes: (r.participacoes as unknown as Participacao[]) ?? [],
      comprasAdequadas: r.comprasAdequadas,
    };
  }

  async salvarDeclaracoes(prestacaoId: string, dados: Omit<Declaracoes, 'prestacaoId'>): Promise<Declaracoes> {
    const data = {
      houveContratacao: dados.houveContratacao,
      empresasPertencentes: J(dados.empresasPertencentes),
      houveParticipacao: dados.houveParticipacao,
      participacoes: J(dados.participacoes),
      comprasAdequadas: dados.comprasAdequadas,
    };
    await prisma.declaracoesPrestacao.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }

  // ---- Parecer Conclusivo (33) ----
  async obterParecer(prestacaoId: string): Promise<Parecer | null> {
    const r = await prisma.parecerConclusivo.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      identificacaoParecer: r.identificacaoParecer,
      conclusaoParecer: r.conclusaoParecer,
      consideracoesParecer: r.consideracoesParecer,
      declaracoes: (r.declaracoes as unknown as DeclaracaoAnalise[]) ?? [],
    };
  }

  async salvarParecer(prestacaoId: string, dados: Omit<Parecer, 'prestacaoId'>): Promise<Parecer> {
    const data = {
      identificacaoParecer: dados.identificacaoParecer,
      conclusaoParecer: dados.conclusaoParecer,
      consideracoesParecer: dados.consideracoesParecer,
      declaracoes: J(dados.declaracoes),
    };
    await prisma.parecerConclusivo.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }

  // ---- Transparência (34) ----
  async obterTransparencia(prestacaoId: string): Promise<Transparencia | null> {
    const r = await prisma.transparencia.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      mantemSitio: r.mantemSitio,
      sitios: (r.sitios as unknown as string[]) ?? [],
      requisitos781: (r.requisitos781 as unknown as RequisitoAtende[]) ?? [],
      requisitos83: (r.requisitos83 as unknown as RequisitoAtende[]) ?? [],
      requisitosDivulgacao: (r.requisitosDivulgacao as unknown as RequisitoAtende[]) ?? [],
    };
  }

  async salvarTransparencia(prestacaoId: string, dados: Omit<Transparencia, 'prestacaoId'>): Promise<Transparencia> {
    const data = {
      mantemSitio: dados.mantemSitio,
      sitios: J(dados.sitios),
      requisitos781: J(dados.requisitos781),
      requisitos83: J(dados.requisitos83),
      requisitosDivulgacao: J(dados.requisitosDivulgacao),
    };
    await prisma.transparencia.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }
}

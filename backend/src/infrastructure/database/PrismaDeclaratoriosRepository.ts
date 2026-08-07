import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDeclaratoriosRepository } from '@/application/declaratorios/IDeclaratoriosRepository';
import type {
  Declaracoes,
  Demonstracoes,
  EmpresaPertencente,
  Participacao,
  Parecer,
  DeclaracaoAnalise,
  PrestacaoEntidade,
  Publicacao,
  PublicacaoParecerAta,
  ItemParecerAta,
  PublicacaoRelAtividades,
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

  // ---- Demonstrações Contábeis (28) ----
  async obterDemonstracoes(prestacaoId: string): Promise<Demonstracoes | null> {
    const r = await prisma.demonstracoesContabeis.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      publicacoes: (r.publicacoes as unknown as Publicacao[]) ?? [],
      respNumeroCrc: r.respNumeroCrc,
      respCpf: r.respCpf,
      respSituacaoRegular: r.respSituacaoRegular,
    };
  }

  async salvarDemonstracoes(prestacaoId: string, dados: Omit<Demonstracoes, 'prestacaoId'>): Promise<Demonstracoes> {
    const data = {
      publicacoes: J(dados.publicacoes),
      respNumeroCrc: dados.respNumeroCrc,
      respCpf: dados.respCpf,
      respSituacaoRegular: dados.respSituacaoRegular,
    };
    await prisma.demonstracoesContabeis.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }

  // ---- Publicações de Parecer ou Ata (29) ----
  async obterPublicacaoParecerAta(prestacaoId: string): Promise<PublicacaoParecerAta | null> {
    const r = await prisma.publicacaoParecerAta.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return { prestacaoId, itens: (r.itens as unknown as ItemParecerAta[]) ?? [] };
  }

  async salvarPublicacaoParecerAta(prestacaoId: string, dados: Omit<PublicacaoParecerAta, 'prestacaoId'>): Promise<PublicacaoParecerAta> {
    const data = { itens: J(dados.itens) };
    await prisma.publicacaoParecerAta.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }

  // ---- Publicação do Relatório de Atividades (30) ----
  async obterPublicacaoRelAtividades(prestacaoId: string): Promise<PublicacaoRelAtividades | null> {
    const r = await prisma.publicacaoRelatorioAtividades.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      houvePublicacaoExercicio: r.houvePublicacaoExercicio,
      publicacoes: (r.publicacoes as unknown as Publicacao[]) ?? [],
    };
  }

  async salvarPublicacaoRelAtividades(prestacaoId: string, dados: Omit<PublicacaoRelAtividades, 'prestacaoId'>): Promise<PublicacaoRelAtividades> {
    const data = { houvePublicacaoExercicio: dados.houvePublicacaoExercicio, publicacoes: J(dados.publicacoes) };
    await prisma.publicacaoRelatorioAtividades.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }

  // ---- Prestação de Contas da Entidade (32) ----
  async obterPrestacaoEntidade(prestacaoId: string): Promise<PrestacaoEntidade | null> {
    const r = await prisma.prestacaoContasEntidade.findUnique({ where: { prestacaoId } });
    if (!r) return null;
    return {
      prestacaoId,
      dataPrestacao: r.dataPrestacao,
      periodoReferenciaInicial: r.periodoReferenciaInicial,
      periodoReferenciaFinal: r.periodoReferenciaFinal,
    };
  }

  async salvarPrestacaoEntidade(prestacaoId: string, dados: Omit<PrestacaoEntidade, 'prestacaoId'>): Promise<PrestacaoEntidade> {
    const data = {
      dataPrestacao: dados.dataPrestacao,
      periodoReferenciaInicial: dados.periodoReferenciaInicial,
      periodoReferenciaFinal: dados.periodoReferenciaFinal,
    };
    await prisma.prestacaoContasEntidade.upsert({ where: { prestacaoId }, create: { prestacaoId, ...data }, update: data });
    return { prestacaoId, ...dados };
  }
}

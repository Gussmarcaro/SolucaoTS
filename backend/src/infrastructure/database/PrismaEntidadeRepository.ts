import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IEntidadeRepository } from '@/application/entidade/IEntidadeRepository';
import type {
  ArquivoEstatuto,
  DadosEntidade,
  ListarEntidadesParams,
  Paginado,
} from '@/application/entidade/dtos';
import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaEntidade } from './buscaTexto';

const selecao = {
  id: true,
  razaoSocial: true,
  nomeFantasia: true,
  cnpj: true,
  inscricaoEstadual: true,
  inscricaoMunicipal: true,
  dataConstituicao: true,
  finalidadeDescricao: true,
  finalidadeArtigo: true,
  dataUltimaAlteracao: true,
  // Só os metadados do estatuto — `estatutoArquivo` fica de fora de propósito,
  // senão toda listagem traria os PDFs junto.
  estatutoArquivoNome: true,
  estatutoArquivoTamanho: true,
  estatutoDataInicial: true,
  estatutoDataAlteracao: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  email: true,
  telefoneFixo: true,
  whatsapp: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.EntidadeBeneficiariaSelect;

export class PrismaEntidadeRepository implements IEntidadeRepository {
  buscarPorId(id: string): Promise<EntidadeBeneficiaria | null> {
    return prisma.entidadeBeneficiaria.findUnique({ where: { id }, select: selecao });
  }

  buscarPorCnpj(cnpj: string): Promise<EntidadeBeneficiaria | null> {
    return prisma.entidadeBeneficiaria.findUnique({
      where: { cnpj: apenasDigitos(cnpj) },
      select: selecao,
    });
  }

  criar(dados: DadosEntidade): Promise<EntidadeBeneficiaria> {
    return prisma.entidadeBeneficiaria.create({
      data: { ...dados, buscaTexto: buscaEntidade(dados) },
      select: selecao,
    });
  }

  atualizar(id: string, dados: DadosEntidade): Promise<EntidadeBeneficiaria> {
    return prisma.entidadeBeneficiaria.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaEntidade(dados) },
      select: selecao,
    });
  }

  definirAtivo(id: string, ativo: boolean): Promise<EntidadeBeneficiaria> {
    return prisma.entidadeBeneficiaria.update({ where: { id }, data: { ativo }, select: selecao });
  }

  salvarEstatuto(id: string, arquivo: ArquivoEstatuto): Promise<EntidadeBeneficiaria> {
    return prisma.entidadeBeneficiaria.update({
      where: { id },
      data: {
        estatutoArquivo: arquivo.conteudo,
        estatutoArquivoNome: arquivo.nome,
        estatutoArquivoTamanho: arquivo.tamanho,
      },
      select: selecao,
    });
  }

  async obterEstatuto(id: string): Promise<ArquivoEstatuto | null> {
    const row = await prisma.entidadeBeneficiaria.findUnique({
      where: { id },
      select: { estatutoArquivo: true, estatutoArquivoNome: true, estatutoArquivoTamanho: true },
    });
    if (!row?.estatutoArquivo) return null;
    return {
      conteudo: Buffer.from(row.estatutoArquivo),
      nome: row.estatutoArquivoNome ?? 'estatuto.pdf',
      tamanho: row.estatutoArquivoTamanho ?? row.estatutoArquivo.length,
    };
  }

  removerEstatuto(id: string): Promise<EntidadeBeneficiaria> {
    return prisma.entidadeBeneficiaria.update({
      where: { id },
      data: { estatutoArquivo: null, estatutoArquivoNome: null, estatutoArquivoTamanho: null },
      select: selecao,
    });
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarEntidadesParams): Promise<Paginado<EntidadeBeneficiaria>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.EntidadeBeneficiariaWhereInput = {
      razaoSocial: texto(filtros.razaoSocial),
      nomeFantasia: texto(filtros.nomeFantasia),
      cidade: texto(filtros.cidade),
      cnpj: filtros.cnpj ? { contains: apenasDigitos(filtros.cnpj) } : undefined,
      uf: filtros.uf ? { equals: filtros.uf.toUpperCase() } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.EntidadeBeneficiariaWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d)
        ors.push(
          { cnpj: { contains: d } },
          { cep: { contains: d } },
          { telefoneFixo: { contains: d } },
          { whatsapp: { contains: d } },
        );
      if (ors.length) where.OR = ors;
    }

    const [total, data] = await Promise.all([
      prisma.entidadeBeneficiaria.count({ where }),
      prisma.entidadeBeneficiaria.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.EntidadeBeneficiariaOrderByWithRelationInput)
          : { razaoSocial: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

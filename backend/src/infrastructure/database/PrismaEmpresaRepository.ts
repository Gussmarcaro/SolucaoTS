import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IEmpresaRepository } from '@/application/empresa/IEmpresaRepository';
import type {
  AtualizarEmpresaDTO,
  CriarEmpresaDTO,
  ListarEmpresasParams,
  Paginado,
} from '@/application/empresa/dtos';
import type { Empresa } from '@/core/empresa/Empresa';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaEmpresa } from './buscaTexto';

export class PrismaEmpresaRepository implements IEmpresaRepository {
  buscarPorId(id: string): Promise<Empresa | null> {
    return prisma.empresa.findUnique({ where: { id } });
  }

  buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    return prisma.empresa.findUnique({ where: { cnpj: apenasDigitos(cnpj) } });
  }

  criar(dados: CriarEmpresaDTO): Promise<Empresa> {
    return prisma.empresa.create({ data: { ...dados, buscaTexto: buscaEmpresa(dados) } });
  }

  atualizar(id: string, dados: AtualizarEmpresaDTO): Promise<Empresa> {
    return prisma.empresa.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaEmpresa(dados) },
    });
  }

  definirAtivo(id: string, ativo: boolean): Promise<Empresa> {
    return prisma.empresa.update({ where: { id }, data: { ativo } });
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarEmpresasParams): Promise<Paginado<Empresa>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.EmpresaWhereInput = {
      razaoSocial: texto(filtros.razaoSocial),
      nomeFantasia: texto(filtros.nomeFantasia),
      cidade: texto(filtros.cidade),
      cnpj: filtros.cnpj ? { contains: apenasDigitos(filtros.cnpj) } : undefined,
      uf: filtros.uf ? { equals: filtros.uf.toUpperCase() } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    // Busca global insensível a acento/caixa: campo normalizado + dígitos.
    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.EmpresaWhereInput[] = [];
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
      prisma.empresa.count({ where }),
      prisma.empresa.findMany({
        where,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.EmpresaOrderByWithRelationInput)
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

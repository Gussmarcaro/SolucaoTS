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

export class PrismaEmpresaRepository implements IEmpresaRepository {
  buscarPorId(id: string): Promise<Empresa | null> {
    return prisma.empresa.findUnique({ where: { id } });
  }

  buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    return prisma.empresa.findUnique({ where: { cnpj: apenasDigitos(cnpj) } });
  }

  criar(dados: CriarEmpresaDTO): Promise<Empresa> {
    return prisma.empresa.create({ data: dados });
  }

  atualizar(id: string, dados: AtualizarEmpresaDTO): Promise<Empresa> {
    return prisma.empresa.update({ where: { id }, data: dados });
  }

  definirAtivo(id: string, ativo: boolean): Promise<Empresa> {
    return prisma.empresa.update({ where: { id }, data: { ativo } });
  }

  atualizarLogo(id: string, logoUrl: string): Promise<Empresa> {
    return prisma.empresa.update({ where: { id }, data: { logoUrl } });
  }

  async listar({ filtros, page, pageSize }: ListarEmpresasParams): Promise<Paginado<Empresa>> {
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

    const [total, data] = await Promise.all([
      prisma.empresa.count({ where }),
      prisma.empresa.findMany({
        where,
        orderBy: { razaoSocial: 'asc' },
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

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IClienteRepository } from '@/application/cliente/IClienteRepository';
import type { DadosCliente, ListarClientesParams, Paginado } from '@/application/cliente/dtos';
import type { Cliente } from '@/core/cliente/Cliente';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaCliente } from './buscaTexto';

const selecao = {
  id: true,
  nome: true,
  codigoMunicipio: true,
  codigoEntidade: true,
  tipoOrgao: true,
  empenhaRepasse: true,
  periodicidade: true,
  cnpj: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.ClienteSelect;

export class PrismaClienteRepository implements IClienteRepository {
  buscarPorId(id: string): Promise<Cliente | null> {
    return prisma.cliente.findUnique({ where: { id }, select: selecao });
  }

  buscarPorCnpj(cnpj: string): Promise<Cliente | null> {
    return prisma.cliente.findUnique({ where: { cnpj: apenasDigitos(cnpj) }, select: selecao });
  }

  buscarPorCodigos(codigoMunicipio: number, codigoEntidade: number): Promise<Cliente | null> {
    return prisma.cliente.findUnique({
      where: { codigoMunicipio_codigoEntidade: { codigoMunicipio, codigoEntidade } },
      select: selecao,
    });
  }

  criar(dados: DadosCliente): Promise<Cliente> {
    return prisma.cliente.create({ data: { ...dados, buscaTexto: buscaCliente(dados) }, select: selecao });
  }

  atualizar(id: string, dados: DadosCliente): Promise<Cliente> {
    return prisma.cliente.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaCliente(dados) },
      select: selecao,
    });
  }

  definirAtivo(id: string, ativo: boolean): Promise<Cliente> {
    return prisma.cliente.update({ where: { id }, data: { ativo }, select: selecao });
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarClientesParams): Promise<Paginado<Cliente>> {
    const where: Prisma.ClienteWhereInput = {
      nome: filtros.nome ? { contains: filtros.nome, mode: 'insensitive' } : undefined,
      cnpj: filtros.cnpj ? { contains: apenasDigitos(filtros.cnpj) } : undefined,
      tipoOrgao: filtros.tipoOrgao ? (filtros.tipoOrgao as Prisma.EnumTipoOrgaoFilter) : undefined,
      periodicidade: filtros.periodicidade ? (filtros.periodicidade as Prisma.EnumPeriodicidadeFilter) : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.ClienteWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d) ors.push({ cnpj: { contains: d } });
      if (ors.length) where.OR = ors;
    }

    const [total, data] = await Promise.all([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.ClienteOrderByWithRelationInput)
          : { nome: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}

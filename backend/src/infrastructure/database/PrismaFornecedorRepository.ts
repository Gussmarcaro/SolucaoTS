import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IFornecedorRepository } from '@/application/fornecedor/IFornecedorRepository';
import type {
  DadosFornecedor,
  ListarFornecedoresParams,
  Paginado,
} from '@/application/fornecedor/dtos';
import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaFornecedor } from './buscaTexto';

const selecao = {
  id: true,
  nome: true,
  documento: true,
  documentoTipo: true,
  inscricaoEstadual: true,
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
} satisfies Prisma.FornecedorSelect;

type Row = Prisma.FornecedorGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Fornecedor {
  return { ...row, documentoTipo: row.documentoTipo as 'CPF' | 'CNPJ' };
}

export class PrismaFornecedorRepository implements IFornecedorRepository {
  async buscarPorId(id: string): Promise<Fornecedor | null> {
    const row = await prisma.fornecedor.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Fornecedor | null> {
    const row = await prisma.fornecedor.findUnique({
      where: { documento: apenasDigitos(documento) },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosFornecedor): Promise<Fornecedor> {
    const row = await prisma.fornecedor.create({
      data: { ...dados, buscaTexto: buscaFornecedor(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosFornecedor): Promise<Fornecedor> {
    const row = await prisma.fornecedor.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaFornecedor(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Fornecedor> {
    const row = await prisma.fornecedor.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarFornecedoresParams): Promise<Paginado<Fornecedor>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.FornecedorWhereInput = {
      nome: texto(filtros.nome),
      cidade: texto(filtros.cidade),
      documento: filtros.documento ? { contains: apenasDigitos(filtros.documento) } : undefined,
      uf: filtros.uf ? { equals: filtros.uf.toUpperCase() } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.FornecedorWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d)
        ors.push(
          { documento: { contains: d } },
          { cep: { contains: d } },
          { telefoneFixo: { contains: d } },
          { whatsapp: { contains: d } },
        );
      if (ors.length) where.OR = ors;
    }

    const [total, rows] = await Promise.all([
      prisma.fornecedor.count({ where }),
      prisma.fornecedor.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.FornecedorOrderByWithRelationInput)
          : { nome: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map(toDomain),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

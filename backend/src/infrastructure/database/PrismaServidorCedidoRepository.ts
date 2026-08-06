import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IServidorCedidoRepository } from '@/application/servidorCedido/IServidorCedidoRepository';
import type {
  DadosServidorCedido,
  ListarServidoresCedidosParams,
  Paginado,
} from '@/application/servidorCedido/dtos';
import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { paraDataISO } from '@/shared/datas';
import { buscaServidorCedido } from './buscaTexto';

const selecao = {
  id: true,
  nome: true,
  cpf: true,
  cargoPublico: true,
  funcaoEntidade: true,
  onusPagamento: true,
  cargaHoraria: true,
  remuneracaoBruta: true,
  dataInicialCessao: true,
  dataFinalCessao: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.ServidorCedidoCadastroSelect;

type Row = Prisma.ServidorCedidoCadastroGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): ServidorCedido {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    cargoPublico: row.cargoPublico,
    funcaoEntidade: row.funcaoEntidade,
    onusPagamento: row.onusPagamento,
    cargaHoraria: row.cargaHoraria,
    remuneracaoBruta: Number(row.remuneracaoBruta),
    dataInicialCessao: paraDataISO(row.dataInicialCessao),
    dataFinalCessao: row.dataFinalCessao ? paraDataISO(row.dataFinalCessao) : null,
    ativo: row.ativo,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaServidorCedidoRepository implements IServidorCedidoRepository {
  async buscarPorId(id: string): Promise<ServidorCedido | null> {
    const row = await prisma.servidorCedidoCadastro.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorCpf(cpf: string): Promise<ServidorCedido | null> {
    const row = await prisma.servidorCedidoCadastro.findUnique({
      where: { cpf: apenasDigitos(cpf) },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosServidorCedido): Promise<ServidorCedido> {
    const row = await prisma.servidorCedidoCadastro.create({
      data: { ...dados, buscaTexto: buscaServidorCedido(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosServidorCedido): Promise<ServidorCedido> {
    const row = await prisma.servidorCedidoCadastro.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaServidorCedido(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<ServidorCedido> {
    const row = await prisma.servidorCedidoCadastro.update({
      where: { id },
      data: { ativo },
      select: selecao,
    });
    return toDomain(row);
  }

  async listar({
    filtros,
    busca,
    ordem,
    page,
    pageSize,
  }: ListarServidoresCedidosParams): Promise<Paginado<ServidorCedido>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;

    const where: Prisma.ServidorCedidoCadastroWhereInput = {
      nome: texto(filtros.nome),
      cargoPublico: texto(filtros.cargoPublico),
      onusPagamento: filtros.onusPagamento ? { equals: filtros.onusPagamento } : undefined,
      cpf: filtros.cpf ? { contains: apenasDigitos(filtros.cpf) } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.ServidorCedidoCadastroWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d) ors.push({ cpf: { contains: d } });
      if (ors.length) where.OR = ors;
    }

    const [total, rows] = await Promise.all([
      prisma.servidorCedidoCadastro.count({ where }),
      prisma.servidorCedidoCadastro.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.ServidorCedidoCadastroOrderByWithRelationInput)
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

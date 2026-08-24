import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDocumentoFiscalRepository } from '@/application/documentoFiscal/IDocumentoFiscalRepository';
import type { DadosDocumentoFiscal } from '@/application/documentoFiscal/dtos';
import type { DocumentoFiscal, TipoDocumento } from '@/core/documentoFiscal/DocumentoFiscal';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  prestacaoId: true,
  numero: true,
  credorTipoDoc: true,
  credorNumeroDoc: true,
  credorNome: true,
  contratoNumero: true,
  descricao: true,
  dataEmissao: true,
  estadoEmissor: true,
  valorBruto: true,
  valorEncargos: true,
  tipoDocumento: true,
  categoriaDespesaTipo: true,
  rateioProveniente: true,
  rateioPercentual: true,
} satisfies Prisma.DocumentoFiscalSelect;

type Row = Prisma.DocumentoFiscalGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): DocumentoFiscal {
  return {
    id: row.id,
    prestacaoId: row.prestacaoId,
    numero: row.numero,
    credorTipoDoc: row.credorTipoDoc as TipoDocumento,
    credorNumeroDoc: row.credorNumeroDoc,
    credorNome: row.credorNome,
    contratoNumero: row.contratoNumero,
    descricao: row.descricao,
    dataEmissao: paraDataISO(row.dataEmissao),
    estadoEmissor: row.estadoEmissor,
    valorBruto: Number(row.valorBruto),
    valorEncargos: Number(row.valorEncargos),
    tipoDocumento: row.tipoDocumento,
    categoriaDespesaTipo: row.categoriaDespesaTipo,
    rateioProveniente: row.rateioProveniente,
    rateioPercentual: row.rateioPercentual == null ? null : Number(row.rateioPercentual),
  };
}

export class PrismaDocumentoFiscalRepository implements IDocumentoFiscalRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<DocumentoFiscal[]> {
    const rows = await prisma.documentoFiscal.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: [{ dataEmissao: 'asc' }, { numero: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<DocumentoFiscal | null> {
    const row = await prisma.documentoFiscal.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarDuplicado(
    prestacaoId: string,
    numero: string,
    credorTipoDoc: TipoDocumento,
    credorNumeroDoc: string,
  ): Promise<DocumentoFiscal | null> {
    const row = await prisma.documentoFiscal.findUnique({
      where: {
        prestacaoId_numero_credorTipoDoc_credorNumeroDoc: {
          prestacaoId,
          numero,
          credorTipoDoc,
          credorNumeroDoc,
        },
      },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosDocumentoFiscal): Promise<DocumentoFiscal> {
    const row = await prisma.documentoFiscal.create({
      data: { prestacaoId, ...dados },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDocumentoFiscal): Promise<DocumentoFiscal> {
    const row = await prisma.documentoFiscal.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.documentoFiscal.delete({ where: { id } });
  }
}

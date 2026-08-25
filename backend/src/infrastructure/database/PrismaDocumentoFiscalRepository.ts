import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IDocumentoFiscalRepository } from '@/application/documentoFiscal/IDocumentoFiscalRepository';
import type { DadosDocumentoFiscal } from '@/application/documentoFiscal/dtos';
import type { ArquivoPdf } from '@/core/entidade/complementos';
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
  contratoId: true,
  descricao: true,
  dataEmissao: true,
  estadoEmissor: true,
  valorBruto: true,
  valorEncargos: true,
  retencaoTipo: true,
  tipoDocumento: true,
  categoriaDespesaTipo: true,
  propostaCategoria: true,
  propostaSubcategoria: true,
  // Metadados do anexo. O campo `arquivo` (Bytes) fica de fora de propósito:
  // trazê-lo aqui carregaria megabytes por linha em toda listagem.
  arquivoNome: true,
  arquivoTamanho: true,
  arquivoEnviadoEm: true,
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
    contratoId: row.contratoId,
    descricao: row.descricao,
    dataEmissao: paraDataISO(row.dataEmissao),
    estadoEmissor: row.estadoEmissor,
    valorBruto: Number(row.valorBruto),
    valorEncargos: Number(row.valorEncargos),
    retencaoTipo: row.retencaoTipo,
    tipoDocumento: row.tipoDocumento,
    categoriaDespesaTipo: row.categoriaDespesaTipo,
    propostaCategoria: row.propostaCategoria,
    propostaSubcategoria: row.propostaSubcategoria,
    arquivoNome: row.arquivoNome,
    arquivoTamanho: row.arquivoTamanho,
    arquivoEnviadoEm: row.arquivoEnviadoEm ? row.arquivoEnviadoEm.toISOString() : null,
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

  /**
   * Grava ou remove a digitalização. `null` limpa os quatro campos juntos —
   * nome sem conteúdo faria a tela oferecer um download que devolve 404.
   */
  async salvarArquivo(id: string, arquivo: ArquivoPdf | null): Promise<DocumentoFiscal> {
    const row = await prisma.documentoFiscal.update({
      where: { id },
      data: arquivo
        ? {
            arquivo: arquivo.conteudo,
            arquivoNome: arquivo.nome,
            arquivoTamanho: arquivo.tamanho,
            arquivoEnviadoEm: new Date(),
          }
        : { arquivo: null, arquivoNome: null, arquivoTamanho: null, arquivoEnviadoEm: null },
      select: selecao,
    });
    return toDomain(row);
  }

  /** O conteúdo, só na hora do download. */
  async obterArquivo(id: string): Promise<ArquivoPdf | null> {
    const row = await prisma.documentoFiscal.findUnique({
      where: { id },
      select: { arquivo: true, arquivoNome: true, arquivoTamanho: true },
    });
    if (!row?.arquivo || !row.arquivoNome) return null;
    return {
      nome: row.arquivoNome,
      tamanho: row.arquivoTamanho ?? row.arquivo.length,
      conteudo: Buffer.from(row.arquivo),
    };
  }
}

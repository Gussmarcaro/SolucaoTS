import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { NotFoundError } from '@/shared/errors';
import { paraDataISO } from '@/shared/datas';
import type { IEntidadeComplementosRepository } from '@/application/entidadeComplementos/IEntidadeComplementosRepository';
import type {
  DadosDocumentoRegularidade,
  DadosMembroConselho,
  DadosMembroDiretoria,
} from '@/application/entidadeComplementos/dtos';
import type {
  ArquivoPdf,
  AtaDiretoriaArquivo,
  DocumentoRegularidade,
  MembroConselho,
  MembroDiretoria,
  TipoConselho,
  TipoDocumentoRegularidade,
} from '@/core/entidade/complementos';

const iso = (d: Date | null) => (d ? paraDataISO(d) : null);

/** Campos de pessoa, compartilhados por diretoria e conselhos. */
const selecaoPessoa = {
  id: true,
  entidadeBeneficiariaId: true,
  nome: true,
  cpf: true,
  dataNascimento: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  email: true,
  telefone: true,
  cargo: true,
  dataEntrada: true,
  dataSaida: true,
  criadoEm: true,
  atualizadoEm: true,
};

const selecaoDiretoria = {
  ...selecaoPessoa,
  ataDataEleicao: true,
  ataDataRegistro: true,
  ataLocalRegistro: true,
  possuiRemuneracao: true,
  remuneracaoDescricao: true,
  remuneracaoArtigo: true,
  remuneracaoValores: true,
} satisfies Prisma.MembroDiretoriaSelect;

// `ataArquivo` fica fora de propósito: o binário só é lido no download.
const selecaoConselho = {
  ...selecaoPessoa,
  tipoConselho: true,
  ataDataNomeacao: true,
  ataDataRegistro: true,
  ataLocalRegistro: true,
  ataArquivoNome: true,
  ataArquivoTamanho: true,
} satisfies Prisma.MembroConselhoSelect;

const selecaoDocumento = {
  id: true,
  entidadeBeneficiariaId: true,
  tipo: true,
  arquivoNome: true,
  arquivoTamanho: true,
  dataGeracao: true,
  dataVencimento: true,
  publicacao: true,
  orgaoEmissor: true,
  legislacao: true,
  data: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.DocumentoRegularidadeSelect;

const selecaoAta = {
  id: true,
  entidadeBeneficiariaId: true,
  arquivoNome: true,
  arquivoTamanho: true,
  criadoEm: true,
} satisfies Prisma.AtaDiretoriaArquivoSelect;

type LinhaPessoa = Prisma.MembroDiretoriaGetPayload<{ select: typeof selecaoPessoa }>;

function pessoaParaDominio(row: LinhaPessoa) {
  return {
    id: row.id,
    entidadeBeneficiariaId: row.entidadeBeneficiariaId,
    nome: row.nome,
    cpf: row.cpf,
    dataNascimento: iso(row.dataNascimento),
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    cidade: row.cidade,
    uf: row.uf,
    email: row.email,
    telefone: row.telefone,
    cargo: row.cargo,
    dataEntrada: iso(row.dataEntrada),
    dataSaida: iso(row.dataSaida),
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

export class PrismaEntidadeComplementosRepository implements IEntidadeComplementosRepository {
  async entidadeExiste(entidadeId: string): Promise<boolean> {
    const e = await prisma.entidadeBeneficiaria.findUnique({
      where: { id: entidadeId },
      select: { id: true },
    });
    return !!e;
  }

  // ---- Diretoria ----

  async listarDiretoria(entidadeId: string): Promise<MembroDiretoria[]> {
    const rows = await prisma.membroDiretoria.findMany({
      where: { entidadeBeneficiariaId: entidadeId },
      select: selecaoDiretoria,
      orderBy: [{ nome: 'asc' }],
    });
    return rows.map((r) => ({
      ...pessoaParaDominio(r),
      ataDataEleicao: iso(r.ataDataEleicao),
      ataDataRegistro: iso(r.ataDataRegistro),
      ataLocalRegistro: r.ataLocalRegistro,
      possuiRemuneracao: r.possuiRemuneracao,
      remuneracaoDescricao: r.remuneracaoDescricao,
      remuneracaoArtigo: r.remuneracaoArtigo,
      remuneracaoValores: r.remuneracaoValores ?? null,
    }));
  }

  private async umMembroDiretoria(entidadeId: string, id: string): Promise<MembroDiretoria> {
    const todos = await this.listarDiretoria(entidadeId);
    const achado = todos.find((m) => m.id === id);
    if (!achado) throw new NotFoundError('Membro da diretoria não encontrado.');
    return achado;
  }

  async criarMembroDiretoria(
    entidadeId: string,
    dados: DadosMembroDiretoria,
  ): Promise<MembroDiretoria> {
    const { id } = await prisma.membroDiretoria.create({
      data: {
        entidadeBeneficiariaId: entidadeId,
        ...dados,
        remuneracaoValores: (dados.remuneracaoValores ?? null) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return this.umMembroDiretoria(entidadeId, id);
  }

  async atualizarMembroDiretoria(
    entidadeId: string,
    id: string,
    dados: DadosMembroDiretoria,
  ): Promise<MembroDiretoria> {
    // `updateMany` com o id da entidade junto: um id de outra entidade não
    // encontra linha e vira 404, em vez de alterar registro alheio.
    const { count } = await prisma.membroDiretoria.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: {
        ...dados,
        remuneracaoValores: (dados.remuneracaoValores ?? null) as Prisma.InputJsonValue,
      },
    });
    if (!count) throw new NotFoundError('Membro da diretoria não encontrado.');
    return this.umMembroDiretoria(entidadeId, id);
  }

  async excluirMembroDiretoria(entidadeId: string, id: string): Promise<void> {
    const { count } = await prisma.membroDiretoria.deleteMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
    });
    if (!count) throw new NotFoundError('Membro da diretoria não encontrado.');
  }

  // ---- Atas de eleição ----

  async listarAtasDiretoria(entidadeId: string): Promise<AtaDiretoriaArquivo[]> {
    return prisma.ataDiretoriaArquivo.findMany({
      where: { entidadeBeneficiariaId: entidadeId },
      select: selecaoAta,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async criarAtaDiretoria(entidadeId: string, arquivo: ArquivoPdf): Promise<AtaDiretoriaArquivo> {
    return prisma.ataDiretoriaArquivo.create({
      data: {
        entidadeBeneficiariaId: entidadeId,
        arquivoNome: arquivo.nome,
        arquivoTamanho: arquivo.tamanho,
        arquivo: arquivo.conteudo,
      },
      select: selecaoAta,
    });
  }

  async obterAtaDiretoria(entidadeId: string, id: string): Promise<ArquivoPdf | null> {
    const row = await prisma.ataDiretoriaArquivo.findFirst({
      where: { id, entidadeBeneficiariaId: entidadeId },
      select: { arquivo: true, arquivoNome: true, arquivoTamanho: true },
    });
    if (!row) return null;
    return {
      conteudo: Buffer.from(row.arquivo),
      nome: row.arquivoNome,
      tamanho: row.arquivoTamanho,
    };
  }

  async excluirAtaDiretoria(entidadeId: string, id: string): Promise<void> {
    const { count } = await prisma.ataDiretoriaArquivo.deleteMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
    });
    if (!count) throw new NotFoundError('Ata não encontrada.');
  }

  // ---- Conselhos ----

  async listarConselhos(entidadeId: string): Promise<MembroConselho[]> {
    const rows = await prisma.membroConselho.findMany({
      where: { entidadeBeneficiariaId: entidadeId },
      select: selecaoConselho,
      orderBy: [{ tipoConselho: 'asc' }, { nome: 'asc' }],
    });
    return rows.map((r) => ({
      ...pessoaParaDominio(r),
      tipoConselho: r.tipoConselho as TipoConselho,
      ataDataNomeacao: iso(r.ataDataNomeacao),
      ataDataRegistro: iso(r.ataDataRegistro),
      ataLocalRegistro: r.ataLocalRegistro,
      ataArquivoNome: r.ataArquivoNome,
      ataArquivoTamanho: r.ataArquivoTamanho,
    }));
  }

  private async umMembroConselho(entidadeId: string, id: string): Promise<MembroConselho> {
    const todos = await this.listarConselhos(entidadeId);
    const achado = todos.find((m) => m.id === id);
    if (!achado) throw new NotFoundError('Membro do conselho não encontrado.');
    return achado;
  }

  async criarMembroConselho(
    entidadeId: string,
    dados: DadosMembroConselho,
  ): Promise<MembroConselho> {
    const { id } = await prisma.membroConselho.create({
      data: { entidadeBeneficiariaId: entidadeId, ...dados },
      select: { id: true },
    });
    return this.umMembroConselho(entidadeId, id);
  }

  async atualizarMembroConselho(
    entidadeId: string,
    id: string,
    dados: DadosMembroConselho,
  ): Promise<MembroConselho> {
    const { count } = await prisma.membroConselho.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: dados,
    });
    if (!count) throw new NotFoundError('Membro do conselho não encontrado.');
    return this.umMembroConselho(entidadeId, id);
  }

  async excluirMembroConselho(entidadeId: string, id: string): Promise<void> {
    const { count } = await prisma.membroConselho.deleteMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
    });
    if (!count) throw new NotFoundError('Membro do conselho não encontrado.');
  }

  async salvarAtaConselho(
    entidadeId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<MembroConselho> {
    const { count } = await prisma.membroConselho.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: {
        ataArquivo: arquivo.conteudo,
        ataArquivoNome: arquivo.nome,
        ataArquivoTamanho: arquivo.tamanho,
      },
    });
    if (!count) throw new NotFoundError('Membro do conselho não encontrado.');
    return this.umMembroConselho(entidadeId, id);
  }

  async obterAtaConselho(entidadeId: string, id: string): Promise<ArquivoPdf | null> {
    const row = await prisma.membroConselho.findFirst({
      where: { id, entidadeBeneficiariaId: entidadeId },
      select: { ataArquivo: true, ataArquivoNome: true, ataArquivoTamanho: true },
    });
    if (!row?.ataArquivo) return null;
    return {
      conteudo: Buffer.from(row.ataArquivo),
      nome: row.ataArquivoNome ?? 'ata-nomeacao.pdf',
      tamanho: row.ataArquivoTamanho ?? row.ataArquivo.length,
    };
  }

  async removerAtaConselho(entidadeId: string, id: string): Promise<MembroConselho> {
    const { count } = await prisma.membroConselho.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: { ataArquivo: null, ataArquivoNome: null, ataArquivoTamanho: null },
    });
    if (!count) throw new NotFoundError('Membro do conselho não encontrado.');
    return this.umMembroConselho(entidadeId, id);
  }

  // ---- Regularidade fiscal / cadastral ----

  private mapaDocumento(row: {
    id: string;
    entidadeBeneficiariaId: string;
    tipo: string;
    arquivoNome: string | null;
    arquivoTamanho: number | null;
    dataGeracao: Date | null;
    dataVencimento: Date | null;
    publicacao: string | null;
    orgaoEmissor: string | null;
    legislacao: string | null;
    data: Date | null;
    criadoEm: Date;
    atualizadoEm: Date;
  }): DocumentoRegularidade {
    return {
      ...row,
      tipo: row.tipo as TipoDocumentoRegularidade,
      dataGeracao: iso(row.dataGeracao),
      dataVencimento: iso(row.dataVencimento),
      data: iso(row.data),
    };
  }

  async listarDocumentos(entidadeId: string): Promise<DocumentoRegularidade[]> {
    const rows = await prisma.documentoRegularidade.findMany({
      where: { entidadeBeneficiariaId: entidadeId },
      select: selecaoDocumento,
      orderBy: [{ tipo: 'asc' }, { criadoEm: 'asc' }],
    });
    return rows.map((r) => this.mapaDocumento(r));
  }

  async buscarDocumentoPorTipo(
    entidadeId: string,
    tipo: TipoDocumentoRegularidade,
  ): Promise<DocumentoRegularidade | null> {
    const row = await prisma.documentoRegularidade.findFirst({
      where: { entidadeBeneficiariaId: entidadeId, tipo },
      select: selecaoDocumento,
    });
    return row ? this.mapaDocumento(row) : null;
  }

  private async umDocumento(entidadeId: string, id: string): Promise<DocumentoRegularidade> {
    const row = await prisma.documentoRegularidade.findFirst({
      where: { id, entidadeBeneficiariaId: entidadeId },
      select: selecaoDocumento,
    });
    if (!row) throw new NotFoundError('Documento não encontrado.');
    return this.mapaDocumento(row);
  }

  async criarDocumento(
    entidadeId: string,
    dados: DadosDocumentoRegularidade,
  ): Promise<DocumentoRegularidade> {
    const row = await prisma.documentoRegularidade.create({
      data: { entidadeBeneficiariaId: entidadeId, ...dados },
      select: selecaoDocumento,
    });
    return this.mapaDocumento(row);
  }

  async atualizarDocumento(
    entidadeId: string,
    id: string,
    dados: DadosDocumentoRegularidade,
  ): Promise<DocumentoRegularidade> {
    const { count } = await prisma.documentoRegularidade.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: dados,
    });
    if (!count) throw new NotFoundError('Documento não encontrado.');
    return this.umDocumento(entidadeId, id);
  }

  async excluirDocumento(entidadeId: string, id: string): Promise<void> {
    const { count } = await prisma.documentoRegularidade.deleteMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
    });
    if (!count) throw new NotFoundError('Documento não encontrado.');
  }

  async salvarArquivoDocumento(
    entidadeId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<DocumentoRegularidade> {
    const atual = await this.umDocumento(entidadeId, id);
    await prisma.documentoRegularidade.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: {
        arquivo: arquivo.conteudo,
        arquivoTamanho: arquivo.tamanho,
        // O nome digitado prevalece; sem ele, usa o nome do próprio arquivo.
        arquivoNome: atual.arquivoNome ?? arquivo.nome,
      },
    });
    return this.umDocumento(entidadeId, id);
  }

  async obterArquivoDocumento(entidadeId: string, id: string): Promise<ArquivoPdf | null> {
    const row = await prisma.documentoRegularidade.findFirst({
      where: { id, entidadeBeneficiariaId: entidadeId },
      select: { arquivo: true, arquivoNome: true, arquivoTamanho: true },
    });
    if (!row?.arquivo) return null;
    return {
      conteudo: Buffer.from(row.arquivo),
      nome: row.arquivoNome ?? 'documento.pdf',
      tamanho: row.arquivoTamanho ?? row.arquivo.length,
    };
  }

  async removerArquivoDocumento(
    entidadeId: string,
    id: string,
  ): Promise<DocumentoRegularidade> {
    const { count } = await prisma.documentoRegularidade.updateMany({
      where: { id, entidadeBeneficiariaId: entidadeId },
      data: { arquivo: null, arquivoTamanho: null },
    });
    if (!count) throw new NotFoundError('Documento não encontrado.');
    return this.umDocumento(entidadeId, id);
  }
}

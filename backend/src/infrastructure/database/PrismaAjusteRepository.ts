import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type {
  ArquivoTermoCiencia,
  DadosAjuste,
  ListarAjustesParams,
  Paginado,
} from '@/application/ajuste/dtos';
import type { Ajuste, Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  entidadeBeneficiariaId: true,
  tipoAjuste: true,
  descricaoResumida: true,
  codigoAjuste: true,
  numero: true,
  objeto: true,
  valorGlobal: true,
  dataAssinatura: true,
  vigenciaInicial: true,
  vigenciaFinal: true,
  periodicidade: true,
  status: true,
  previsaoFederal: true,
  previsaoEstadual: true,
  previsaoMunicipal: true,
  responsavelNome: true,
  responsavelCpf: true,
  responsavelDataNascimento: true,
  responsavelCep: true,
  responsavelLogradouro: true,
  responsavelNumero: true,
  responsavelComplemento: true,
  responsavelBairro: true,
  responsavelCidade: true,
  responsavelUf: true,
  responsavelEmail: true,
  responsavelTelefone: true,
  responsavelCargo: true,
  responsavelDataEntrada: true,
  responsavelDataSaida: true,
  // Só os metadados do termo — `termoCienciaArquivo` fica de fora de propósito.
  termoCienciaArquivoNome: true,
  termoCienciaArquivoTamanho: true,
  publicacaoLocal: true,
  publicacaoLink: true,
  publicacaoData: true,
  criadoEm: true,
  atualizadoEm: true,
  entidadeBeneficiaria: { select: { razaoSocial: true } },
  cliente: { select: { nome: true } },
} satisfies Prisma.AjusteSelect;

type Row = Prisma.AjusteGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Ajuste {
  return {
    id: row.id,
    clienteId: row.clienteId ?? null,
    orgaoNome: row.cliente?.nome ?? null,
    entidadeBeneficiariaId: row.entidadeBeneficiariaId,
    entidadeNome: row.entidadeBeneficiaria?.razaoSocial ?? '',
    tipoAjuste: row.tipoAjuste as TipoAjuste,
    descricaoResumida: row.descricaoResumida,
    codigoAjuste: row.codigoAjuste,
    numero: row.numero,
    objeto: row.objeto,
    valorGlobal: Number(row.valorGlobal),
    dataAssinatura: paraDataISO(row.dataAssinatura),
    vigenciaInicial: row.vigenciaInicial ? paraDataISO(row.vigenciaInicial) : null,
    vigenciaFinal: row.vigenciaFinal ? paraDataISO(row.vigenciaFinal) : null,
    periodicidade: row.periodicidade as Periodicidade,
    status: row.status as StatusAjuste,

    previsaoFederal: row.previsaoFederal === null ? null : Number(row.previsaoFederal),
    previsaoEstadual: row.previsaoEstadual === null ? null : Number(row.previsaoEstadual),
    previsaoMunicipal: row.previsaoMunicipal === null ? null : Number(row.previsaoMunicipal),

    responsavelNome: row.responsavelNome,
    responsavelCpf: row.responsavelCpf,
    responsavelDataNascimento: row.responsavelDataNascimento
      ? paraDataISO(row.responsavelDataNascimento)
      : null,
    responsavelCep: row.responsavelCep,
    responsavelLogradouro: row.responsavelLogradouro,
    responsavelNumero: row.responsavelNumero,
    responsavelComplemento: row.responsavelComplemento,
    responsavelBairro: row.responsavelBairro,
    responsavelCidade: row.responsavelCidade,
    responsavelUf: row.responsavelUf,
    responsavelEmail: row.responsavelEmail,
    responsavelTelefone: row.responsavelTelefone,
    responsavelCargo: row.responsavelCargo,
    responsavelDataEntrada: row.responsavelDataEntrada
      ? paraDataISO(row.responsavelDataEntrada)
      : null,
    responsavelDataSaida: row.responsavelDataSaida ? paraDataISO(row.responsavelDataSaida) : null,

    termoCienciaArquivoNome: row.termoCienciaArquivoNome,
    termoCienciaArquivoTamanho: row.termoCienciaArquivoTamanho,

    publicacaoLocal: row.publicacaoLocal,
    publicacaoLink: row.publicacaoLink,
    publicacaoData: row.publicacaoData ? paraDataISO(row.publicacaoData) : null,

    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

/** Campos escalares persistidos (sem o join de leitura). */
function toData(dados: DadosAjuste) {
  return {
    clienteId: dados.clienteId,
    entidadeBeneficiariaId: dados.entidadeBeneficiariaId,
    tipoAjuste: dados.tipoAjuste,
    descricaoResumida: dados.descricaoResumida,
    codigoAjuste: dados.codigoAjuste,
    numero: dados.numero,
    objeto: dados.objeto,
    valorGlobal: dados.valorGlobal,
    dataAssinatura: dados.dataAssinatura,
    vigenciaInicial: dados.vigenciaInicial,
    vigenciaFinal: dados.vigenciaFinal,
    periodicidade: dados.periodicidade,
    status: dados.status,

    previsaoFederal: dados.previsaoFederal,
    previsaoEstadual: dados.previsaoEstadual,
    previsaoMunicipal: dados.previsaoMunicipal,

    responsavelNome: dados.responsavelNome,
    responsavelCpf: dados.responsavelCpf,
    responsavelDataNascimento: dados.responsavelDataNascimento,
    responsavelCep: dados.responsavelCep,
    responsavelLogradouro: dados.responsavelLogradouro,
    responsavelNumero: dados.responsavelNumero,
    responsavelComplemento: dados.responsavelComplemento,
    responsavelBairro: dados.responsavelBairro,
    responsavelCidade: dados.responsavelCidade,
    responsavelUf: dados.responsavelUf,
    responsavelEmail: dados.responsavelEmail,
    responsavelTelefone: dados.responsavelTelefone,
    responsavelCargo: dados.responsavelCargo,
    responsavelDataEntrada: dados.responsavelDataEntrada,
    responsavelDataSaida: dados.responsavelDataSaida,

    publicacaoLocal: dados.publicacaoLocal,
    publicacaoLink: dados.publicacaoLink,
    publicacaoData: dados.publicacaoData,
  };
}

export class PrismaAjusteRepository implements IAjusteRepository {
  async buscarPorId(id: string): Promise<Ajuste | null> {
    const row = await prisma.ajuste.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null> {
    const row = await prisma.ajuste.findUnique({ where: { codigoAjuste }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean> {
    const e = await prisma.entidadeBeneficiaria.findUnique({
      where: { id: entidadeBeneficiariaId },
      select: { id: true },
    });
    return !!e;
  }

  async clienteExiste(clienteId: string): Promise<boolean> {
    const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    return !!c;
  }

  async criar(dados: DadosAjuste): Promise<Ajuste> {
    const row = await prisma.ajuste.create({ data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosAjuste): Promise<Ajuste> {
    const row = await prisma.ajuste.update({ where: { id }, data: toData(dados), select: selecao });
    return toDomain(row);
  }

  async salvarTermoCiencia(id: string, arquivo: ArquivoTermoCiencia): Promise<Ajuste> {
    const row = await prisma.ajuste.update({
      where: { id },
      data: {
        termoCienciaArquivo: arquivo.conteudo,
        termoCienciaArquivoNome: arquivo.nome,
        termoCienciaArquivoTamanho: arquivo.tamanho,
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async obterTermoCiencia(id: string): Promise<ArquivoTermoCiencia | null> {
    const row = await prisma.ajuste.findUnique({
      where: { id },
      select: {
        termoCienciaArquivo: true,
        termoCienciaArquivoNome: true,
        termoCienciaArquivoTamanho: true,
      },
    });
    if (!row?.termoCienciaArquivo) return null;
    return {
      conteudo: Buffer.from(row.termoCienciaArquivo),
      nome: row.termoCienciaArquivoNome ?? 'termo-ciencia.pdf',
      tamanho: row.termoCienciaArquivoTamanho ?? row.termoCienciaArquivo.length,
    };
  }

  async removerTermoCiencia(id: string): Promise<Ajuste> {
    const row = await prisma.ajuste.update({
      where: { id },
      data: {
        termoCienciaArquivo: null,
        termoCienciaArquivoNome: null,
        termoCienciaArquivoTamanho: null,
      },
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
  }: ListarAjustesParams): Promise<Paginado<Ajuste>> {
    const where: Prisma.AjusteWhereInput = {
      codigoAjuste: filtros.codigoAjuste ? { contains: filtros.codigoAjuste } : undefined,
      tipoAjuste: filtros.tipoAjuste ? { equals: filtros.tipoAjuste as TipoAjuste } : undefined,
      status: filtros.status ? { equals: filtros.status as StatusAjuste } : undefined,
      entidadeBeneficiariaId: filtros.entidadeBeneficiariaId || undefined,
    };

    if (busca) {
      where.OR = [
        { codigoAjuste: { contains: busca, mode: 'insensitive' } },
        { descricaoResumida: { contains: busca, mode: 'insensitive' } },
        { numero: { contains: busca, mode: 'insensitive' } },
        { objeto: { contains: busca, mode: 'insensitive' } },
        { entidadeBeneficiaria: { razaoSocial: { contains: busca, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.ajuste.count({ where }),
      prisma.ajuste.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.AjusteOrderByWithRelationInput)
          : { dataAssinatura: 'desc' },
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

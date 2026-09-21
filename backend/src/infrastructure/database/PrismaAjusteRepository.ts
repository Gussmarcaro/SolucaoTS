import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { tenantObrigatorio } from '@/shared/contexto';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type {
  ArquivoAjuste,
  DadosAjuste,
  ListarAjustesParams,
  Paginado,
  TipoDocumentoAjuste,
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
  ajusteAssinadoArquivoNome: true,
  ajusteAssinadoArquivoTamanho: true,
  publicacaoLocal: true,
  publicacaoLink: true,
  publicacaoData: true,
  criadoEm: true,
  atualizadoEm: true,
  fontesRecurso: { select: { fonteRecursoTipo: true }, orderBy: { fonteRecursoTipo: 'asc' } },
  contasBancarias: {
    select: {
      id: true,
      contaBancariaId: true,
      banco: true,
      agencia: true,
      conta: true,
      contaTipo: true,
      fonteRecursoTipo: true,
      apelido: true,
    },
    orderBy: [{ banco: 'asc' }, { agencia: 'asc' }, { conta: 'asc' }],
  },
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
    fontesRecurso: row.fontesRecurso.map((f) => f.fonteRecursoTipo),
    contasBancarias: row.contasBancarias.map((c) => ({
      id: c.id,
      contaBancariaId: c.contaBancariaId,
      banco: c.banco,
      agencia: c.agencia,
      conta: c.conta,
      contaTipo: c.contaTipo,
      fonteRecursoTipo: c.fonteRecursoTipo,
      apelido: c.apelido,
    })),
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
    ajusteAssinadoArquivoNome: row.ajusteAssinadoArquivoNome,
    ajusteAssinadoArquivoTamanho: row.ajusteAssinadoArquivoTamanho,

    publicacaoLocal: row.publicacaoLocal,
    publicacaoLink: row.publicacaoLink,
    publicacaoData: row.publicacaoData ? paraDataISO(row.publicacaoData) : null,

    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

/** Campos escalares persistidos (sem o join de leitura). */
/** Filhos gravados à parte — ver `criar` e `atualizar`. */
function filhos(dados: DadosAjuste) {
  return {
    fontesRecurso: { create: dados.fontesRecurso.map((fonteRecursoTipo) => ({ fonteRecursoTipo })) },
    contasBancarias: { create: dados.contasBancarias },
  };
}

/**
 * **`clienteId` não sai daqui, de propósito.**
 *
 * Ele vinha do payload — e `toData` é usado tanto na criação quanto na
 * alteração. Na criação, mandar um órgão alheio no corpo gravava o ajuste
 * dentro dele (o carimbo da extension é `??=`, e só preenche o que vem vazio);
 * na alteração, dava para **mover** o próprio ajuste para outro órgão e vê-lo
 * sumir. Nenhum dos dois era alcançável pela tela, que só lista o órgão de
 * quem está logado, mas a rota aceitava.
 *
 * Agora o órgão vem do token, na criação, e na alteração simplesmente não se
 * toca: ajuste não muda de dono.
 */
function toData(dados: DadosAjuste) {
  return {
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

/**
 * De qual trio de colunas cada documento vive.
 *
 * É o único lugar do sistema que conhece esses nomes. Acima daqui tudo fala em
 * `TipoDocumentoAjuste`, então acrescentar um terceiro anexo é uma linha aqui e
 * uma no enum — nenhuma regra, nenhuma rota e nenhuma tela a mais.
 */
const COLUNAS: Record<TipoDocumentoAjuste, { arquivo: string; nome: string; tamanho: string; padrao: string }> = {
  TERMO_CIENCIA: {
    arquivo: 'termoCienciaArquivo',
    nome: 'termoCienciaArquivoNome',
    tamanho: 'termoCienciaArquivoTamanho',
    padrao: 'termo-ciencia.pdf',
  },
  AJUSTE_ASSINADO: {
    arquivo: 'ajusteAssinadoArquivo',
    nome: 'ajusteAssinadoArquivoNome',
    tamanho: 'ajusteAssinadoArquivoTamanho',
    padrao: 'ajuste-celebrado.pdf',
  },
};

export class PrismaAjusteRepository implements IAjusteRepository {
  async buscarPorId(id: string): Promise<Ajuste | null> {
    const row = await prisma.ajuste.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null> {
    // `findFirst`: o código do ajuste é único **por órgão** (`@@unique`
    // composto), e o recorte entra pela extension de tenant.
    const row = await prisma.ajuste.findFirst({ where: { codigoAjuste }, select: selecao });
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
    const row = await prisma.ajuste.create({
      data: { ...toData(dados), ...filhos(dados), clienteId: tenantObrigatorio('Ajuste') },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosAjuste): Promise<Ajuste> {
    // Fontes e contas são substituídas por inteiro, como nos demais blocos com
    // filhos: calcular o diff daria uma trilha mais fina e trocaria uma operação
    // previsível por três.
    const [, , row] = await prisma.$transaction([
      prisma.ajusteFonteRecurso.deleteMany({ where: { ajusteId: id } }),
      prisma.ajusteContaBancaria.deleteMany({ where: { ajusteId: id } }),
      prisma.ajuste.update({
        where: { id },
        data: { ...toData(dados), ...filhos(dados) },
        select: selecao,
      }),
    ]);
    return toDomain(row);
  }

  async salvarDocumento(
    id: string,
    tipo: TipoDocumentoAjuste,
    arquivo: ArquivoAjuste,
  ): Promise<Ajuste> {
    const c = COLUNAS[tipo];
    const row = await prisma.ajuste.update({
      where: { id },
      data: {
        [c.arquivo]: arquivo.conteudo,
        [c.nome]: arquivo.nome,
        [c.tamanho]: arquivo.tamanho,
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async obterDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<ArquivoAjuste | null> {
    const c = COLUNAS[tipo];
    const row = (await prisma.ajuste.findUnique({
      where: { id },
      select: { [c.arquivo]: true, [c.nome]: true, [c.tamanho]: true },
    })) as Record<string, unknown> | null;

    const conteudo = row?.[c.arquivo] as Uint8Array | null | undefined;
    if (!conteudo) return null;
    return {
      conteudo: Buffer.from(conteudo),
      nome: (row?.[c.nome] as string | null) ?? c.padrao,
      tamanho: (row?.[c.tamanho] as number | null) ?? conteudo.length,
    };
  }

  async removerDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<Ajuste> {
    const c = COLUNAS[tipo];
    const row = await prisma.ajuste.update({
      where: { id },
      data: { [c.arquivo]: null, [c.nome]: null, [c.tamanho]: null },
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

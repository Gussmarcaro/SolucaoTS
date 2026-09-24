import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { buscaDocumentoFiscal } from './buscaTexto';
import { normalizarTexto } from '@/shared/normalizar';
import { apenasDigitos } from '@/shared/validators/documento';
import { tenantObrigatorio } from '@/shared/contexto';
import type { IDocumentoFiscalRepository } from '@/application/documentoFiscal/IDocumentoFiscalRepository';
import type { DadosDocumentoFiscal } from '@/application/documentoFiscal/dtos';
import type { ArquivoPdf } from '@/core/entidade/complementos';
import type { DocumentoFiscal, TipoDocumento } from '@/core/documentoFiscal/DocumentoFiscal';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  prestacaoId: true,
  numero: true,
  credorTipoDoc: true,
  credorNumeroDoc: true,
  credorNome: true,
  contratoNumero: true,
  contratoFirmadoId: true,
  contratoId: true,
  descricao: true,
  dataEmissao: true,
  estadoEmissor: true,
  valorBruto: true,
  valorEncargos: true,
  retencaoTipo: true,
  retencoes: { select: { tipo: true, valor: true }, orderBy: { tipo: "asc" } },
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
  rateioId: true,
  rateioPercentual: true,
} satisfies Prisma.DocumentoFiscalSelect;

type Row = Prisma.DocumentoFiscalGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): DocumentoFiscal {
  return {
    id: row.id,
    clienteId: row.clienteId,
    prestacaoId: row.prestacaoId,
    numero: row.numero,
    credorTipoDoc: row.credorTipoDoc as TipoDocumento,
    credorNumeroDoc: row.credorNumeroDoc,
    credorNome: row.credorNome,
    contratoNumero: row.contratoNumero,
    contratoFirmadoId: row.contratoFirmadoId,
    contratoId: row.contratoId,
    descricao: row.descricao,
    dataEmissao: paraDataISO(row.dataEmissao),
    estadoEmissor: row.estadoEmissor,
    valorBruto: Number(row.valorBruto),
    valorEncargos: Number(row.valorEncargos),
    retencaoTipo: row.retencaoTipo,
    retencoes: row.retencoes.map((r) => ({ tipo: r.tipo, valor: Number(r.valor) })),
    tipoDocumento: row.tipoDocumento,
    categoriaDespesaTipo: row.categoriaDespesaTipo,
    propostaCategoria: row.propostaCategoria,
    propostaSubcategoria: row.propostaSubcategoria,
    arquivoNome: row.arquivoNome,
    arquivoTamanho: row.arquivoTamanho,
    arquivoEnviadoEm: row.arquivoEnviadoEm ? row.arquivoEnviadoEm.toISOString() : null,
    rateioProveniente: row.rateioProveniente,
    rateioId: row.rateioId,
    rateioPercentual: row.rateioPercentual == null ? null : Number(row.rateioPercentual),
  };
}

/**
 * Separa o detalhamento das retencoes dos campos escalares.
 *
 * O Prisma nao aceita um array de filhos misturado aos campos da linha: ele
 * precisa de uma escrita aninhada. Na atualizacao,  + 
 * substitui o conjunto inteiro, e nao calcula diferenca — sao poucas linhas
 * por nota, e uma substituicao previsivel vale mais que tres operacoes que
 * podem divergir.
 */
function separar(dados: DadosDocumentoFiscal) {
  const { retencoes, ...escalares } = dados;
  // O texto de busca é derivado, não informado: calculá-lo aqui garante que
  // toda gravação o atualize — inclusive um caminho novo que ninguém lembrou.
  return { escalares: { ...escalares, buscaTexto: buscaDocumentoFiscal(escalares) }, retencoes };
}

export class PrismaDocumentoFiscalRepository implements IDocumentoFiscalRepository {
  /**
   * As notas apropriadas por esta prestação, pela tabela de ligação.
   *
   * O percentual vem da ligação, não da nota: a mesma nota rateada vale 30%
   * numa prestação e 50% noutra, e guardar isso na nota obrigaria a duplicá-la.
   */
  async listarApropriados(prestacaoId: string) {
    const rows = await prisma.prestacaoDocumentoFiscal.findMany({
      where: { prestacaoId },
      select: {
        percentual: true,
        contratoId: true,
        documentoFiscal: { select: selecao },
      },
      orderBy: [{ documentoFiscal: { dataEmissao: 'asc' } }, { documentoFiscal: { numero: 'asc' } }],
    });

    return rows.map((r) => {
      const doc = toDomain(r.documentoFiscal);
      const percentual = Number(r.percentual);
      return {
        ...doc,
        percentual,
        contratoIdPrestacao: r.contratoId,
        // Duas casas: percentual com dízima produz centavo a mais na soma, e a
        // prestação compara este número com o pagamento, que é exato.
        valorApropriado: Math.round(doc.valorBruto * (percentual / 100) * 100) / 100,
      };
    });
  }

  /**
   * As notas do órgão no exercício, menos as que esta prestação já apropriou.
   *
   * O recorte por órgão vem da extension; o por exercício vem daqui, porque é
   * regra de negócio: nota de outro ano não pertence a esta prestação.
   */
  async listarCandidatos(prestacaoId: string, ano: number) {
    const rows = await prisma.documentoFiscal.findMany({
      where: {
        dataEmissao: {
          gte: new Date(Date.UTC(ano, 0, 1)),
          lte: new Date(Date.UTC(ano, 11, 31)),
        },
        prestacoes: { none: { prestacaoId } },
      },
      select: selecao,
      orderBy: [{ dataEmissao: 'asc' }, { numero: 'asc' }],
    });
    return rows.map(toDomain);
  }

  /**
   * Cria ou atualiza a apropriação.
   *
   * `upsert` porque apropriar duas vezes é gesto comum — o usuário marca, o
   * rateio muda, ele marca de novo. Recusar a segunda obrigaria a desmarcar
   * antes, sem nada ganhar.
   */
  async apropriar(
    prestacaoId: string,
    documentoFiscalId: string,
    dados: { percentual: number; contratoId: string | null },
  ): Promise<void> {
    await prisma.prestacaoDocumentoFiscal.upsert({
      where: { prestacaoId_documentoFiscalId: { prestacaoId, documentoFiscalId } },
      create: { prestacaoId, documentoFiscalId, ...dados },
      update: dados,
    });
  }

  /** A nota continua existindo no órgão; só sai desta prestação. */
  async desapropriar(prestacaoId: string, documentoFiscalId: string): Promise<void> {
    await prisma.prestacaoDocumentoFiscal.deleteMany({ where: { prestacaoId, documentoFiscalId } });
  }

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

  /**
   * As notas do órgão, da mais recente para a mais antiga.
   *
   * Sem `where`: quem recorta é a extension de tenant. Escrever o filtro aqui
   * daria a impressão de que ele é opcional em consultas novas — e é o
   * contrário: consulta sem recorte é a falha que funciona perfeitamente para
   * quem a escreveu, e para os outros órgãos também.
   */
  async listarDoOrgao(): Promise<DocumentoFiscal[]> {
    const rows = await prisma.documentoFiscal.findMany({
      select: selecao,
      orderBy: [{ dataEmissao: 'desc' }, { numero: 'desc' }],
    });
    return rows.map(toDomain);
  }

  /**
   * Duplicidade no órgão.
   *
   * `findFirst`, e não `findUnique` pela chave composta: durante a migração a
   * mesma nota pode existir com `clienteId` nulo (gravada pela prestação) e a
   * chave única não a alcançaria. O recorte por órgão continua vindo da
   * extension.
   */
  async buscarDuplicadoNoOrgao(
    numero: string,
    credorTipoDoc: TipoDocumento,
    credorNumeroDoc: string,
  ): Promise<DocumentoFiscal | null> {
    const row = await prisma.documentoFiscal.findFirst({
      where: { numero, credorTipoDoc, credorNumeroDoc },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  /** A nota nasce sem prestação: quem a apropria decide isso depois. */
  async criarNoOrgao(dados: DadosDocumentoFiscal): Promise<DocumentoFiscal> {
    const { escalares, retencoes } = separar(dados);
    const row = await prisma.documentoFiscal.create({
      data: {
        ...escalares,
        clienteId: tenantObrigatorio('DocumentoFiscal'),
        retencoes: { create: retencoes },
      },
      select: selecao,
    });
    return toDomain(row);
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
    const { escalares, retencoes } = separar(dados);
    const row = await prisma.documentoFiscal.create({
      data: {
        prestacaoId,
        ...escalares,
        clienteId: tenantObrigatorio('DocumentoFiscal'),
        retencoes: { create: retencoes },
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosDocumentoFiscal): Promise<DocumentoFiscal> {
    const { escalares, retencoes } = separar(dados);
    const row = await prisma.documentoFiscal.update({
      where: { id },
      data: { ...escalares, retencoes: { deleteMany: {}, create: retencoes } },
      select: selecao,
    });
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

  /**
   * Busca da barra superior.
   *
   * Duas frentes, e a separação é o que a torna útil: o **texto** (credor,
   * descrição) casa no `buscaTexto` normalizado; os **dígitos** vão direto ao
   * número da nota e ao documento do credor. Jogar tudo no texto faria `123`
   * casar com qualquer descrição que contivesse 123 — e procurar nota pelo
   * número é justamente a busca que precisa ser precisa.
   *
   * Sem `where` de órgão: quem recorta é a extension de tenant.
   */
  async buscarGlobal(termo: string, limite: number): Promise<DocumentoFiscal[]> {
    const t = normalizarTexto(termo);
    const d = apenasDigitos(termo);
    const ors: Prisma.DocumentoFiscalWhereInput[] = [];
    if (t) ors.push({ buscaTexto: { contains: t } });
    if (d) ors.push({ numero: { contains: d } }, { credorNumeroDoc: { contains: d } });
    if (!ors.length) return [];

    const rows = await prisma.documentoFiscal.findMany({
      where: { OR: ors },
      select: selecao,
      orderBy: [{ dataEmissao: 'desc' }],
      take: limite,
    });
    return rows.map(toDomain);
  }
}

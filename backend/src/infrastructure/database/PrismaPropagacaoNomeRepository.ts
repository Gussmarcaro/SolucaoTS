import { prisma } from './prisma';
import { buscaContrato, buscaDocumentoFiscal } from './buscaTexto';
import { copiaPodeAcompanhar, type LevantamentoNome } from '@/core/fornecedor/propagacaoNome';
import type { IPropagacaoNomeRepository } from '@/application/fornecedor/PropagarNomeFornecedorUseCase';

/**
 * As três cópias do nome do credor, e de onde sai o status de cada uma.
 *
 * **O órgão vai escrito à mão em toda consulta**, e é o cuidado central deste
 * arquivo: `Contrato` (o bloco da prestação) não é raiz de tenant, e a
 * extension não o filtra. Procurar contratos só pelo CNPJ atualizaria os de
 * qualquer órgão que tenha contratado o mesmo fornecedor. Por isso tudo parte
 * do `clienteId` do próprio fornecedor — que, esse sim, já veio recortado.
 *
 * Cada linha é atualizada uma a uma, e não por `updateMany`: o `buscaTexto`
 * depende da descrição de cada nota, e a trilha de auditoria registra a
 * alteração por registro.
 */
export class PrismaPropagacaoNomeRepository implements IPropagacaoNomeRepository {
  private async fornecedor(id: string) {
    return prisma.fornecedor.findUnique({
      where: { id },
      select: { nome: true, documento: true, documentoTipo: true, clienteId: true },
    });
  }

  /** As cópias com nome diferente do cadastro, já separadas em atualizáveis e travadas. */
  private async copias(id: string) {
    const f = await this.fornecedor(id);
    if (!f) return null;

    const [notas, contratos, firmados] = await Promise.all([
      prisma.documentoFiscal.findMany({
        where: {
          clienteId: f.clienteId,
          credorTipoDoc: f.documentoTipo,
          credorNumeroDoc: f.documento,
          NOT: { credorNome: f.nome },
        },
        select: {
          id: true,
          descricao: true,
          // As duas ligações com prestação: a nova (nota do Financeiro
          // apropriada por N prestações) e a antiga (nota lançada dentro dela).
          prestacao: { select: { status: true } },
          prestacoes: { select: { prestacao: { select: { status: true } } } },
        },
      }),
      prisma.contrato.findMany({
        where: {
          prestacao: { ajuste: { clienteId: f.clienteId } },
          credorTipoDoc: f.documentoTipo,
          credorNumeroDoc: f.documento,
          NOT: { credorNome: f.nome },
        },
        select: { id: true, prestacao: { select: { status: true } } },
      }),
      prisma.contratoFirmado.findMany({
        where: {
          clienteId: f.clienteId,
          credorDocumentoTipo: f.documentoTipo,
          credorDocumento: f.documento,
          NOT: { credorNome: f.nome },
        },
        select: { id: true, numero: true, credorDocumento: true, naturezaContratacao: true, objeto: true },
      }),
    ]);

    const notasAtualizaveis = notas.filter((n) =>
      copiaPodeAcompanhar([
        ...(n.prestacao ? [n.prestacao.status] : []),
        ...n.prestacoes.map((p) => p.prestacao.status),
      ]),
    );
    const contratosAtualizaveis = contratos.filter((c) => copiaPodeAcompanhar([c.prestacao.status]));

    return { f, notas, notasAtualizaveis, contratos, contratosAtualizaveis, firmados };
  }

  private resumo(c: NonNullable<Awaited<ReturnType<PrismaPropagacaoNomeRepository['copias']>>>): LevantamentoNome {
    return {
      nome: c.f.nome,
      notas: { atualizaveis: c.notasAtualizaveis.length, travadas: c.notas.length - c.notasAtualizaveis.length },
      contratosPrestacao: {
        atualizaveis: c.contratosAtualizaveis.length,
        travados: c.contratos.length - c.contratosAtualizaveis.length,
      },
      contratosCadastro: c.firmados.length,
    };
  }

  async levantar(id: string): Promise<LevantamentoNome | null> {
    const c = await this.copias(id);
    return c ? this.resumo(c) : null;
  }

  async aplicar(id: string) {
    const c = await this.copias(id);
    if (!c) return null;
    const nome = c.f.nome;

    await prisma.$transaction([
      ...c.notasAtualizaveis.map((n) =>
        prisma.documentoFiscal.update({
          where: { id: n.id },
          data: { credorNome: nome, buscaTexto: buscaDocumentoFiscal({ credorNome: nome, descricao: n.descricao }) },
        }),
      ),
      ...c.contratosAtualizaveis.map((x) =>
        prisma.contrato.update({ where: { id: x.id }, data: { credorNome: nome } }),
      ),
      ...c.firmados.map((x) =>
        prisma.contratoFirmado.update({
          where: { id: x.id },
          data: {
            credorNome: nome,
            buscaTexto: buscaContrato({
              numero: x.numero,
              credorNome: nome,
              credorDocumento: x.credorDocumento,
              naturezaContratacao: x.naturezaContratacao,
              objeto: x.objeto,
            }),
          },
        }),
      ),
    ]);

    const atualizadas = c.notasAtualizaveis.length + c.contratosAtualizaveis.length + c.firmados.length;
    const depois = await this.levantar(id);
    return { atualizadas, depois: depois! };
  }
}

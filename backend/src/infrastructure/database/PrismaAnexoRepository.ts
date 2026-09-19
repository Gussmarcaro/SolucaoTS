import { prisma } from './prisma';
import type { IAnexoRepository } from '@/application/anexo/IAnexoRepository';
import type { Anexo, ArquivoAnexo, DonoAnexo, TipoAnexo } from '@/core/anexo/Anexo';

/**
 * Onde o dono entra na consulta.
 *
 * O `Anexo` é filho, e a extension de tenant só recorta as raízes. Filtrar
 * pelo **dono** (a nota ou o pagamento) é o que mantém o isolamento: o caso de
 * uso já conferiu que aquele dono é do órgão, e daqui em diante toda consulta
 * passa por ele.
 */
const onde = (dono: DonoAnexo, donoId: string) =>
  dono === 'DESPESA' ? { documentoFiscalId: donoId } : { pagamentoId: donoId };

const selecao = { id: true, tipo: true, nome: true, tamanho: true, enviadoEm: true };

export class PrismaAnexoRepository implements IAnexoRepository {
  async listar(dono: DonoAnexo, donoId: string): Promise<Anexo[]> {
    const rows = await prisma.anexo.findMany({
      where: onde(dono, donoId),
      select: selecao,
      // Pelo tipo primeiro: a tela agrupa por ele, e dentro do grupo o mais
      // antigo em cima, que é a ordem em que os documentos foram juntados.
      orderBy: [{ tipo: 'asc' }, { enviadoEm: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo as TipoAnexo,
      nome: r.nome,
      tamanho: r.tamanho,
      enviadoEm: r.enviadoEm.toISOString(),
    }));
  }

  async salvar(
    dono: DonoAnexo,
    donoId: string,
    tipo: TipoAnexo,
    arquivo: ArquivoAnexo,
  ): Promise<Anexo> {
    const row = await prisma.anexo.create({
      data: {
        ...onde(dono, donoId),
        tipo,
        nome: arquivo.nome,
        tamanho: arquivo.tamanho,
        conteudo: arquivo.conteudo,
      },
      select: selecao,
    });
    return {
      id: row.id,
      tipo: row.tipo as TipoAnexo,
      nome: row.nome,
      tamanho: row.tamanho,
      enviadoEm: row.enviadoEm.toISOString(),
    };
  }

  async buscarConteudo(
    dono: DonoAnexo,
    donoId: string,
    anexoId: string,
  ): Promise<ArquivoAnexo | null> {
    // `findFirst` com o dono no `where`, e não `findUnique` pelo id: é a
    // conferência de propriedade e a leitura na mesma consulta. Anexo de outro
    // lançamento simplesmente "não existe".
    const row = await prisma.anexo.findFirst({
      where: { id: anexoId, ...onde(dono, donoId) },
      select: { nome: true, tamanho: true, conteudo: true },
    });
    if (!row) return null;
    return {
      nome: row.nome,
      tamanho: row.tamanho,
      conteudo: Buffer.from(row.conteudo),
    };
  }

  async excluir(anexoId: string): Promise<void> {
    await prisma.anexo.delete({ where: { id: anexoId } });
  }
}

import { prisma } from './prisma';
import type { INotaRapidaRepository, NotaRapida } from '@/application/notaRapida/NotaRapidaUseCases';

const selecao = { id: true, texto: true, criadoEm: true, atualizadoEm: true } as const;

const paraDominio = (n: { id: string; texto: string; criadoEm: Date; atualizadoEm: Date }): NotaRapida => ({
  id: n.id,
  texto: n.texto,
  criadoEm: n.criadoEm.toISOString(),
  atualizadoEm: n.atualizadoEm.toISOString(),
});

/**
 * `NotaRapida` não é raiz de tenant, então nada a filtra sozinho: **toda**
 * consulta aqui leva `usuarioId`, inclusive as de escrita. É por isso que
 * atualizar e excluir usam `updateMany`/`deleteMany` com o par id+dono — um
 * `update({ where: { id } })` alcançaria a nota de qualquer um que soubesse o
 * id.
 */
export class PrismaNotaRapidaRepository implements INotaRapidaRepository {
  async listar(usuarioId: string) {
    const rows = await prisma.notaRapida.findMany({
      where: { usuarioId },
      select: selecao,
      orderBy: { atualizadoEm: 'desc' },
    });
    return rows.map(paraDominio);
  }

  contar(usuarioId: string) {
    return prisma.notaRapida.count({ where: { usuarioId } });
  }

  async criar(usuarioId: string, texto: string) {
    return paraDominio(await prisma.notaRapida.create({ data: { usuarioId, texto }, select: selecao }));
  }

  async atualizar(usuarioId: string, id: string, texto: string) {
    const r = await prisma.notaRapida.updateMany({ where: { id, usuarioId }, data: { texto } });
    if (r.count === 0) return null;
    const n = await prisma.notaRapida.findFirst({ where: { id, usuarioId }, select: selecao });
    return n ? paraDominio(n) : null;
  }

  async excluir(usuarioId: string, id: string) {
    const r = await prisma.notaRapida.deleteMany({ where: { id, usuarioId } });
    return r.count > 0;
  }
}

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { normalizarTexto } from '@/shared/normalizar';
import { apenasDigitos } from '@/shared/validators/documento';
import { tenantObrigatorio } from '@/shared/contexto';
import { buscaContaBancaria } from './buscaTexto';
import type { IContaBancariaRepository } from '@/application/contaBancaria/IContaBancariaRepository';
import type { DadosContaBancaria } from '@/application/contaBancaria/dtos';
import type { ContaBancaria } from '@/core/contaBancaria/ContaBancaria';

const selecao = {
  id: true,
  clienteId: true,
  banco: true,
  agencia: true,
  conta: true,
  contaTipo: true,
  fonteRecursoTipo: true,
  apelido: true,
  observacao: true,
  ativo: true,
} satisfies Prisma.ContaBancariaSelect;

type Row = Prisma.ContaBancariaGetPayload<{ select: typeof selecao }>;
const toDomain = (row: Row): ContaBancaria => row;

export class PrismaContaBancariaRepository implements IContaBancariaRepository {
  /** Sem `where` de órgão: quem recorta é a extension de tenant. */
  async listar(apenasAtivas: boolean): Promise<ContaBancaria[]> {
    const rows = await prisma.contaBancaria.findMany({
      where: apenasAtivas ? { ativo: true } : undefined,
      select: selecao,
      orderBy: [{ ativo: 'desc' }, { banco: 'asc' }, { agencia: 'asc' }, { conta: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<ContaBancaria | null> {
    const row = await prisma.contaBancaria.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  /**
   * `findFirst`, e não a chave composta: `clienteId` é nulo enquanto o backfill
   * do multi-tenant não roda, e a chave única não alcançaria esses registros.
   */
  async buscarDuplicada(dados: DadosContaBancaria): Promise<ContaBancaria | null> {
    const row = await prisma.contaBancaria.findFirst({
      where: {
        banco: dados.banco,
        agencia: dados.agencia,
        conta: dados.conta,
        contaTipo: dados.contaTipo,
      },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: DadosContaBancaria): Promise<ContaBancaria> {
    const row = await prisma.contaBancaria.create({
      data: { ...dados, buscaTexto: buscaContaBancaria(dados), clienteId: tenantObrigatorio('ContaBancaria') },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosContaBancaria): Promise<ContaBancaria> {
    const row = await prisma.contaBancaria.update({
      where: { id },
      data: { ...dados, buscaTexto: buscaContaBancaria(dados) },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<ContaBancaria> {
    const row = await prisma.contaBancaria.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  /**
   * Busca da barra superior.
   *
   * Texto no apelido; dígitos na agência e na conta. O **banco** também casa
   * por número — digitar `341` acha as contas do Itaú, que é como alguém que
   * conhece os códigos procura.
   *
   * Contas inativas ficam de fora: quem digita na barra quer chegar a algo que
   * usa, e a inativa já tem a tela própria para ser encontrada.
   */
  async buscarGlobal(termo: string, limite: number): Promise<ContaBancaria[]> {
    const t = normalizarTexto(termo);
    const d = apenasDigitos(termo);
    const ors: Prisma.ContaBancariaWhereInput[] = [];
    if (t) ors.push({ buscaTexto: { contains: t } });
    if (d) {
      ors.push({ agencia: { contains: d } }, { conta: { contains: d } });
      const n = Number(d);
      if (Number.isSafeInteger(n)) ors.push({ banco: n });
    }
    if (!ors.length) return [];

    const rows = await prisma.contaBancaria.findMany({
      where: { ativo: true, OR: ors },
      select: selecao,
      orderBy: [{ apelido: 'asc' }, { banco: 'asc' }],
      take: limite,
    });
    return rows.map(toDomain);
  }

  /** Uma consulta de existência, não a lista: só interessa se há alguma. */
  async emUso(id: string): Promise<boolean> {
    const uso = await prisma.ajusteContaBancaria.findFirst({
      where: { contaBancariaId: id },
      select: { id: true },
    });
    return !!uso;
  }

  async excluir(id: string): Promise<void> {
    await prisma.contaBancaria.delete({ where: { id } });
  }
}

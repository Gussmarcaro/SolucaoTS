import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { chaveDaConta } from '@/core/conciliacao/contas';
import type { VinculoDeAjuste } from '@/core/contaBancaria/vinculos';
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
  async listar(apenasAtivas: boolean, ajusteId?: string): Promise<ContaBancaria[]> {
    const rows = await prisma.contaBancaria.findMany({
      where: apenasAtivas ? { ativo: true } : undefined,
      select: selecao,
      orderBy: [{ ativo: 'desc' }, { banco: 'asc' }, { agencia: 'asc' }, { conta: 'asc' }],
    });
    const contas = rows.map(toDomain);
    if (!ajusteId) return contas;

    /*
     * O recorte pelo ajuste, por **duas** chaves.
     *
     * `contaBancariaId` é o vínculo direto, e é o que o cadastro novo grava.
     * Mas `AjusteContaBancaria.contaBancariaId` é **opcional**: as contas que o
     * ajuste declarou antes do cadastro central existir têm só banco, agência e
     * número soltos. Casar só pelo id esconderia justamente as contas dos
     * ajustes antigos — e o usuário veria a lista vazia num ajuste que declara
     * contas, sem nada explicando.
     *
     * A comparação por dígitos é a mesma da conciliação (`chaveDaConta`): o
     * cadastro traz `1236559` onde o ajuste trouxe `123655-9`, e a agência vem
     * `0001` de um lado e `1` do outro.
     */
    const declaradas = await prisma.ajusteContaBancaria.findMany({
      where: { ajusteId },
      select: { contaBancariaId: true, banco: true, agencia: true, conta: true },
    });
    if (!declaradas.length) return [];

    const porId = new Set(declaradas.map((d) => d.contaBancariaId).filter((x): x is string => !!x));
    const porDigitos = new Set(declaradas.map((d) => chaveDaConta(d)));

    return contas.filter((c) => porId.has(c.id) || porDigitos.has(chaveDaConta(c)));
  }

  /**
   * Todos os vínculos conta↔ajuste do órgão, para a coluna do cadastro.
   *
   * **A consulta parte do `Ajuste`, e não de `AjusteContaBancaria`**, por uma
   * razão de isolamento: o ajuste é raiz de tenant e sai recortado pela
   * extension; a tabela de vínculo não é raiz, e consultá-la direto traria os
   * vínculos de todos os órgãos — a grade mostraria o código de um ajuste
   * alheio ao lado da conta de quem está olhando, e nada acusaria.
   */
  async listarVinculos(): Promise<VinculoDeAjuste[]> {
    const ajustes = await prisma.ajuste.findMany({
      select: {
        id: true,
        codigoAjuste: true,
        entidadeBeneficiaria: { select: { razaoSocial: true } },
        contasBancarias: {
          select: { contaBancariaId: true, banco: true, agencia: true, conta: true },
        },
      },
    });

    return ajustes.flatMap((a) =>
      a.contasBancarias.map((c) => ({
        ajusteId: a.id,
        codigoAjuste: a.codigoAjuste,
        entidadeNome: a.entidadeBeneficiaria?.razaoSocial ?? null,
        contaBancariaId: c.contaBancariaId,
        banco: c.banco,
        agencia: c.agencia,
        conta: c.conta,
      })),
    );
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

  async excluir(id: string): Promise<void> {
    await prisma.contaBancaria.delete({ where: { id } });
  }
}

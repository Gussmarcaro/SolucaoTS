import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IReceitaRepository } from '@/application/receita/IReceitaRepository';
import type { DadosReceita } from '@/application/receita/dtos';
import type { Receita } from '@/core/receita/Receita';
import { paraDataISO } from '@/shared/datas';

const selecao = {
  id: true,
  clienteId: true,
  ajusteId: true,
  prestacaoId: true,
  tipo: true,
  descricao: true,
  dataPrevista: true,
  dataRepasse: true,
  fonteRecursoTipo: true,
  valor: true,
  banco: true,
  agencia: true,
  contaCorrente: true,
  numeroTransacao: true,
} satisfies Prisma.ReceitaSelect;

type Row = Prisma.ReceitaGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Receita {
  return {
    id: row.id,
    clienteId: row.clienteId,
    ajusteId: row.ajusteId,
    prestacaoId: row.prestacaoId,
    tipo: row.tipo,
    descricao: row.descricao,
    dataPrevista: row.dataPrevista ? paraDataISO(row.dataPrevista) : null,
    dataRepasse: row.dataRepasse ? paraDataISO(row.dataRepasse) : null,
    fonteRecursoTipo: row.fonteRecursoTipo,
    valor: Number(row.valor),
    banco: row.banco,
    agencia: row.agencia,
    contaCorrente: row.contaCorrente,
    numeroTransacao: row.numeroTransacao,
  };
}

export class PrismaReceitaRepository implements IReceitaRepository {
  async listarPorPrestacao(prestacaoId: string): Promise<Receita[]> {
    const rows = await prisma.receita.findMany({
      where: { prestacaoId },
      select: selecao,
      orderBy: { dataRepasse: 'asc' },
    });
    return rows.map(toDomain);
  }

  /**
   * Os lançamentos do órgão, do mais recente para o mais antigo.
   *
   * Sem `where`: quem recorta é a extension de tenant. Escrever o filtro aqui
   * sugeriria que ele é opcional numa consulta nova — e é o contrário: consulta
   * sem recorte funciona perfeitamente para quem a escreveu, e para os outros
   * órgãos também.
   */
  async listarDoOrgao() {
    const rows = await prisma.receita.findMany({ select: selecao, orderBy: [{ dataRepasse: 'desc' }, { id: 'desc' }] });
    return rows.map(toDomain);
  }

  /** Nasce sem prestação: quem se apropria dele decide isso depois. */
  async criarNoOrgao(dados: Parameters<typeof this.atualizar>[1]) {
    const row = await prisma.receita.create({ data: { ...dados }, select: selecao });
    return toDomain(row);
  }

  async buscarPorId(id: string): Promise<Receita | null> {
    const row = await prisma.receita.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async criar(prestacaoId: string, dados: DadosReceita): Promise<Receita> {
    const row = await prisma.receita.create({ data: { prestacaoId, ...dados }, select: selecao });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosReceita): Promise<Receita> {
    const row = await prisma.receita.update({ where: { id }, data: dados, select: selecao });
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.receita.delete({ where: { id } });
  }
}

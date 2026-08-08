import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type {
  BuscaClassificacaoParams,
  BuscaDominioParams,
  IDominioRepository,
} from '@/application/dominio/IDominioRepository';
import type { Cbo, ClassificacaoEconomica, ComponenteDespesa } from '@/core/dominio/Dominio';

const selecaoCbo = { codigo: true, titulo: true } satisfies Prisma.CboSelect;

const selecaoClassificacao = {
  codigo: true,
  exercicio: true,
  categoria: true,
  grupo: true,
  modalidade: true,
  elemento: true,
  subelemento: true,
  nome: true,
  escrituracao: true,
  entes: true,
  situacao: true,
} satisfies Prisma.ClassificacaoEconomicaSelect;

const selecaoComponente = { tipo: true, codigo: true, nome: true } satisfies Prisma.ComponenteDespesaSelect;

/** Todos os termos devem aparecer no campo de busca já normalizado. */
function filtroTermos(termos: string[]): { buscaTexto: { contains: string } }[] | undefined {
  return termos.length > 0 ? termos.map((t) => ({ buscaTexto: { contains: t } })) : undefined;
}

export class PrismaDominioRepository implements IDominioRepository {
  buscarCbos({ termos, limite }: BuscaDominioParams): Promise<Cbo[]> {
    return prisma.cbo.findMany({
      where: { AND: filtroTermos(termos) },
      select: selecaoCbo,
      orderBy: { codigo: 'asc' },
      take: limite,
    });
  }

  obterCbo(codigo: string): Promise<Cbo | null> {
    return prisma.cbo.findUnique({ where: { codigo }, select: selecaoCbo });
  }

  buscarClassificacoes({
    termos,
    limite,
    exercicio,
    ente,
  }: BuscaClassificacaoParams): Promise<ClassificacaoEconomica[]> {
    return prisma.classificacaoEconomica.findMany({
      where: {
        exercicio,
        // `entes` guarda a combinação (ex.: 'EMC'); basta conter a letra.
        entes: ente ? { contains: ente } : undefined,
        AND: filtroTermos(termos),
      },
      select: selecaoClassificacao,
      orderBy: { codigo: 'asc' },
      take: limite,
    });
  }

  obterClassificacao(exercicio: number, codigo: string): Promise<ClassificacaoEconomica | null> {
    return prisma.classificacaoEconomica.findUnique({
      where: { exercicio_codigo: { exercicio, codigo } },
      select: selecaoClassificacao,
    });
  }

  listarComponentes(tipo?: string): Promise<ComponenteDespesa[]> {
    return prisma.componenteDespesa.findMany({
      where: { tipo },
      select: selecaoComponente,
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
    });
  }

  async exerciciosDisponiveis(): Promise<number[]> {
    const linhas = await prisma.classificacaoEconomica.findMany({
      distinct: ['exercicio'],
      select: { exercicio: true },
      orderBy: { exercicio: 'desc' },
    });
    return linhas.map((l) => l.exercicio);
  }
}

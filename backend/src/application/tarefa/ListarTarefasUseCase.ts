import type { ResumoTarefas, Tarefa } from '@/core/tarefa/Tarefa';
import { PRIORIDADES, STATUS } from '@/core/tarefa/Tarefa';
import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
import { paraDataISO } from '@/shared/datas';
import type { ITarefaRepository } from './ITarefaRepository';
import type { FiltrosTarefa, Paginado } from './dtos';

const CAMPOS_ORDENAVEIS = ['prazoLegal', 'titulo', 'prioridade', 'status', 'criadoEm'];

export class ListarTarefasUseCase {
  constructor(private readonly repo: ITarefaRepository) {}

  async execute(params: {
    filtros?: Record<string, unknown>;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Tarefa>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const e = params.filtros ?? {};
    const filtros: FiltrosTarefa = {};
    const status = String(e.status ?? '').trim();
    if (STATUS.includes(status as never)) filtros.status = status as never;
    const prioridade = String(e.prioridade ?? '').trim();
    if (PRIORIDADES.includes(prioridade as never)) filtros.prioridade = prioridade as never;
    if (typeof e.ajusteId === 'string' && e.ajusteId.trim()) filtros.ajusteId = e.ajusteId.trim();
    if (typeof e.responsavelId === 'string' && e.responsavelId.trim())
      filtros.responsavelId = e.responsavelId.trim();
    if (e.abertas === true) filtros.abertas = true;
    if (e.atrasadas === true) filtros.atrasadas = true;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    // Sem ordem escolhida, o prazo mais próximo primeiro — a tela existe para
    // mostrar o que vence antes, não o que foi cadastrado por último.
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'desc' ? ('desc' as const) : ('asc' as const) }
      : { campo: 'prazoLegal', direcao: 'asc' as const };

    return this.repo.listar({
      filtros,
      busca: params.busca?.trim() || undefined,
      ordem,
      page,
      pageSize,
    });
  }

  resumo(hoje = new Date()): Promise<ResumoTarefas> {
    return this.repo.resumo(paraDataISO(hoje));
  }
}

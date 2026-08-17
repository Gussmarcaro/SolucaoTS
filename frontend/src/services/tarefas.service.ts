import { http } from './http';
import type {
  FiltrosTarefa,
  Paginado,
  ResumoTarefas,
  StatusTarefa,
  Tarefa,
  TarefaPayload,
} from '@/types/tarefa';

export async function listarTarefas(params: {
  filtros?: FiltrosTarefa;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Tarefa>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Tarefa>>('/tarefas', {
    params: {
      ...filtros,
      busca: busca || undefined,
      orderBy: orderBy || undefined,
      orderDir: orderDir || undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function resumoTarefas(): Promise<ResumoTarefas> {
  const { data } = await http.get<ResumoTarefas>('/tarefas/resumo');
  return data;
}

export async function criarTarefa(payload: TarefaPayload): Promise<Tarefa> {
  const { data } = await http.post<Tarefa>('/tarefas', payload);
  return data;
}

export async function atualizarTarefa(id: string, payload: TarefaPayload): Promise<Tarefa> {
  const { data } = await http.put<Tarefa>(`/tarefas/${id}`, payload);
  return data;
}

export async function definirStatusTarefa(id: string, status: StatusTarefa): Promise<Tarefa> {
  const { data } = await http.patch<Tarefa>(`/tarefas/${id}/status`, { status });
  return data;
}

export async function excluirTarefa(id: string): Promise<void> {
  await http.delete(`/tarefas/${id}`);
}

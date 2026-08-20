import { http } from './http';
import type {
  Compromisso,
  CompromissoPayload,
  Paginado,
  ResumoAgenda,
  StatusCompromisso,
} from '@/types/compromisso';

export interface FiltrosCompromisso {
  tipo?: string;
  status?: string;
  ajusteId?: string;
  responsavelId?: string;
  /** ISO — a agenda consulta por janela de datas. */
  de?: string;
  ate?: string;
  pendentesDeRegistro?: boolean;
}

export async function listarCompromissos(params: {
  filtros?: FiltrosCompromisso;
  busca?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Compromisso>> {
  const { filtros = {}, busca, page, pageSize } = params;
  const { data } = await http.get<Paginado<Compromisso>>('/compromissos', {
    params: { ...filtros, busca: busca || undefined, page, pageSize },
  });
  return data;
}

export async function resumoAgenda(): Promise<ResumoAgenda> {
  const { data } = await http.get<ResumoAgenda>('/compromissos/resumo');
  return data;
}

export async function criarCompromisso(payload: CompromissoPayload): Promise<Compromisso> {
  const { data } = await http.post<Compromisso>('/compromissos', payload);
  return data;
}

export async function atualizarCompromisso(
  id: string,
  payload: CompromissoPayload,
): Promise<Compromisso> {
  const { data } = await http.put<Compromisso>(`/compromissos/${id}`, payload);
  return data;
}

export async function definirStatusCompromisso(
  id: string,
  status: StatusCompromisso,
): Promise<Compromisso> {
  const { data } = await http.patch<Compromisso>(`/compromissos/${id}/status`, { status });
  return data;
}

export async function excluirCompromisso(id: string): Promise<void> {
  await http.delete(`/compromissos/${id}`);
}

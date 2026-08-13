import { http } from './http';
import type { ResultadoBusca } from '@/types/busca';

/** Busca global da barra superior. Devolve os resultados de todos os cadastros. */
export async function buscarGlobal(termo: string, signal?: AbortSignal): Promise<ResultadoBusca[]> {
  const { data } = await http.get<ResultadoBusca[]>('/busca', { params: { q: termo }, signal });
  return data;
}

import { http } from './http';
import type {
  Empenho,
  EmpenhoPayload,
  TermoAditivo,
  TermoAditivoPayload,
} from '@/types/ajusteFilhos';

// ---- Termos Aditivos ----
export async function listarTermos(ajusteId: string): Promise<TermoAditivo[]> {
  const { data } = await http.get<TermoAditivo[]>(`/ajustes/${ajusteId}/termos-aditivos`);
  return data;
}

export async function criarTermo(ajusteId: string, payload: TermoAditivoPayload): Promise<TermoAditivo> {
  const { data } = await http.post<TermoAditivo>(`/ajustes/${ajusteId}/termos-aditivos`, payload);
  return data;
}

export async function atualizarTermo(
  ajusteId: string,
  id: string,
  payload: TermoAditivoPayload,
): Promise<TermoAditivo> {
  const { data } = await http.put<TermoAditivo>(`/ajustes/${ajusteId}/termos-aditivos/${id}`, payload);
  return data;
}

export async function excluirTermo(ajusteId: string, id: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/termos-aditivos/${id}`);
}

// ---- Empenhos ----
export async function listarEmpenhos(ajusteId: string): Promise<Empenho[]> {
  const { data } = await http.get<Empenho[]>(`/ajustes/${ajusteId}/empenhos`);
  return data;
}

export async function criarEmpenho(ajusteId: string, payload: EmpenhoPayload): Promise<Empenho> {
  const { data } = await http.post<Empenho>(`/ajustes/${ajusteId}/empenhos`, payload);
  return data;
}

export async function atualizarEmpenho(
  ajusteId: string,
  id: string,
  payload: EmpenhoPayload,
): Promise<Empenho> {
  const { data } = await http.put<Empenho>(`/ajustes/${ajusteId}/empenhos/${id}`, payload);
  return data;
}

export async function excluirEmpenho(ajusteId: string, id: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/empenhos/${id}`);
}

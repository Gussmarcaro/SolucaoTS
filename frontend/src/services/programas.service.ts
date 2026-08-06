import { http } from './http';
import type { Meta, Programa, MetaPayload, ProgramaPayload } from '@/types/programa';

export async function listarProgramas(ajusteId: string): Promise<Programa[]> {
  const { data } = await http.get<Programa[]>(`/ajustes/${ajusteId}/programas`);
  return data;
}

export async function criarPrograma(ajusteId: string, payload: ProgramaPayload): Promise<Programa> {
  const { data } = await http.post<Programa>(`/ajustes/${ajusteId}/programas`, payload);
  return data;
}

export async function atualizarPrograma(
  ajusteId: string,
  programaId: string,
  payload: ProgramaPayload,
): Promise<Programa> {
  const { data } = await http.put<Programa>(`/ajustes/${ajusteId}/programas/${programaId}`, payload);
  return data;
}

export async function excluirPrograma(ajusteId: string, programaId: string): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/programas/${programaId}`);
}

export async function criarMeta(
  ajusteId: string,
  programaId: string,
  payload: MetaPayload,
): Promise<Meta> {
  const { data } = await http.post<Meta>(
    `/ajustes/${ajusteId}/programas/${programaId}/metas`,
    payload,
  );
  return data;
}

export async function atualizarMeta(
  ajusteId: string,
  programaId: string,
  metaId: string,
  payload: MetaPayload,
): Promise<Meta> {
  const { data } = await http.put<Meta>(
    `/ajustes/${ajusteId}/programas/${programaId}/metas/${metaId}`,
    payload,
  );
  return data;
}

export async function excluirMeta(
  ajusteId: string,
  programaId: string,
  metaId: string,
): Promise<void> {
  await http.delete(`/ajustes/${ajusteId}/programas/${programaId}/metas/${metaId}`);
}

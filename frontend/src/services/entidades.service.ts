import { http } from './http';
import type { Entidade, EntidadePayload, FiltrosEntidade, Paginado } from '@/types/entidade';

export async function listarEntidades(params: {
  filtros?: FiltrosEntidade;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Entidade>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Entidade>>('/entidades', {
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

export async function buscarEntidade(id: string): Promise<Entidade> {
  const { data } = await http.get<Entidade>(`/entidades/${id}`);
  return data;
}

export async function criarEntidade(payload: EntidadePayload): Promise<Entidade> {
  const { data } = await http.post<Entidade>('/entidades', payload);
  return data;
}

export async function atualizarEntidade(id: string, payload: EntidadePayload): Promise<Entidade> {
  const { data } = await http.put<Entidade>(`/entidades/${id}`, payload);
  return data;
}

export async function definirStatusEntidade(id: string, ativo: boolean): Promise<Entidade> {
  const { data } = await http.patch<Entidade>(`/entidades/${id}/status`, { ativo });
  return data;
}

/** Anexa (ou substitui) o PDF do estatuto. Exige a entidade já criada. */
export async function enviarEstatuto(id: string, arquivo: File): Promise<Entidade> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const { data } = await http.post<Entidade>(`/entidades/${id}/estatuto`, form);
  return data;
}

export async function removerEstatuto(id: string): Promise<Entidade> {
  const { data } = await http.delete<Entidade>(`/entidades/${id}/estatuto`);
  return data;
}

/** Baixa o PDF e abre numa nova aba (o Blob evita perder o header de auth). */
export async function abrirEstatuto(id: string): Promise<void> {
  const { data } = await http.get<Blob>(`/entidades/${id}/estatuto`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener');
  // Revoga depois de a aba ter lido o blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

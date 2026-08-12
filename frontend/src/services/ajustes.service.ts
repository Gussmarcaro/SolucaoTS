import { http } from './http';
import type { Ajuste, AjustePayload, FiltrosAjuste, Paginado } from '@/types/ajuste';

export async function listarAjustes(params: {
  filtros?: FiltrosAjuste;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Ajuste>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Ajuste>>('/ajustes', {
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

export async function buscarAjuste(id: string): Promise<Ajuste> {
  const { data } = await http.get<Ajuste>(`/ajustes/${id}`);
  return data;
}

export async function criarAjuste(payload: AjustePayload): Promise<Ajuste> {
  const { data } = await http.post<Ajuste>('/ajustes', payload);
  return data;
}

export async function atualizarAjuste(id: string, payload: AjustePayload): Promise<Ajuste> {
  const { data } = await http.put<Ajuste>(`/ajustes/${id}`, payload);
  return data;
}

/** Anexa (ou substitui) o PDF do Termo de Ciência. Exige o ajuste já criado. */
export async function enviarTermoCiencia(id: string, arquivo: File): Promise<Ajuste> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const { data } = await http.post<Ajuste>(`/ajustes/${id}/termo-ciencia`, form);
  return data;
}

export async function removerTermoCiencia(id: string): Promise<Ajuste> {
  const { data } = await http.delete<Ajuste>(`/ajustes/${id}/termo-ciencia`);
  return data;
}

/** Baixa o PDF e abre numa nova aba (o Blob evita perder o header de auth). */
export async function abrirTermoCiencia(id: string): Promise<void> {
  const { data } = await http.get<Blob>(`/ajustes/${id}/termo-ciencia`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

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

/**
 * Os dois anexos do ajuste — o Termo de Ciência e o instrumento assinado.
 *
 * Um par de funções por documento seriam seis funções quase iguais, e a sexta
 * é sempre a que esquece um detalhe. O tipo vira o caminho da rota, que é a
 * única coisa que de fato muda entre elas.
 */
export type DocumentoAjuste = 'termo-ciencia' | 'ajuste-assinado';

/** Anexa (ou substitui) o PDF. Exige o ajuste já criado. */
export async function enviarDocumentoAjuste(
  id: string,
  doc: DocumentoAjuste,
  arquivo: File,
): Promise<Ajuste> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const { data } = await http.post<Ajuste>(`/ajustes/${id}/${doc}`, form);
  return data;
}

export async function removerDocumentoAjuste(
  id: string,
  doc: DocumentoAjuste,
): Promise<Ajuste> {
  const { data } = await http.delete<Ajuste>(`/ajustes/${id}/${doc}`);
  return data;
}

/** Baixa o PDF e abre numa nova aba (o Blob evita perder o header de auth). */
export async function abrirDocumentoAjuste(id: string, doc: DocumentoAjuste): Promise<void> {
  const { data } = await http.get<Blob>(`/ajustes/${id}/${doc}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

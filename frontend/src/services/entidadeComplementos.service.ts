import { http } from './http';
import type {
  AtaDiretoriaArquivo,
  DocumentoRegularidade,
  DocumentoRegularidadePayload,
  MembroConselho,
  MembroConselhoPayload,
  MembroDiretoria,
  MembroDiretoriaPayload,
} from '@/types/entidadeComplementos';

const base = (entidadeId: string) => `/entidades/${entidadeId}`;

/** Baixa um PDF autenticado e abre em nova aba. */
async function abrirPdf(url: string): Promise<void> {
  const { data } = await http.get<Blob>(url, { responseType: 'blob' });
  const objeto = URL.createObjectURL(data);
  window.open(objeto, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(objeto), 60_000);
}

function formDe(arquivo: File): FormData {
  const form = new FormData();
  form.append('arquivo', arquivo);
  return form;
}

// ---- Diretoria ----

export async function listarDiretoria(entidadeId: string): Promise<MembroDiretoria[]> {
  const { data } = await http.get<MembroDiretoria[]>(`${base(entidadeId)}/diretoria`);
  return data;
}

export async function criarMembroDiretoria(
  entidadeId: string,
  payload: MembroDiretoriaPayload,
): Promise<MembroDiretoria> {
  const { data } = await http.post<MembroDiretoria>(`${base(entidadeId)}/diretoria`, payload);
  return data;
}

export async function atualizarMembroDiretoria(
  entidadeId: string,
  id: string,
  payload: MembroDiretoriaPayload,
): Promise<MembroDiretoria> {
  const { data } = await http.put<MembroDiretoria>(`${base(entidadeId)}/diretoria/${id}`, payload);
  return data;
}

export async function excluirMembroDiretoria(entidadeId: string, id: string): Promise<void> {
  await http.delete(`${base(entidadeId)}/diretoria/${id}`);
}

// ---- Atas de eleição ----

export async function listarAtasDiretoria(entidadeId: string): Promise<AtaDiretoriaArquivo[]> {
  const { data } = await http.get<AtaDiretoriaArquivo[]>(`${base(entidadeId)}/atas-diretoria`);
  return data;
}

export async function enviarAtaDiretoria(
  entidadeId: string,
  arquivo: File,
): Promise<AtaDiretoriaArquivo> {
  const { data } = await http.post<AtaDiretoriaArquivo>(
    `${base(entidadeId)}/atas-diretoria`,
    formDe(arquivo),
  );
  return data;
}

export const abrirAtaDiretoria = (entidadeId: string, id: string) =>
  abrirPdf(`${base(entidadeId)}/atas-diretoria/${id}`);

export async function excluirAtaDiretoria(entidadeId: string, id: string): Promise<void> {
  await http.delete(`${base(entidadeId)}/atas-diretoria/${id}`);
}

// ---- Conselhos ----

export async function listarConselhos(entidadeId: string): Promise<MembroConselho[]> {
  const { data } = await http.get<MembroConselho[]>(`${base(entidadeId)}/conselhos`);
  return data;
}

export async function criarMembroConselho(
  entidadeId: string,
  payload: MembroConselhoPayload,
): Promise<MembroConselho> {
  const { data } = await http.post<MembroConselho>(`${base(entidadeId)}/conselhos`, payload);
  return data;
}

export async function atualizarMembroConselho(
  entidadeId: string,
  id: string,
  payload: MembroConselhoPayload,
): Promise<MembroConselho> {
  const { data } = await http.put<MembroConselho>(`${base(entidadeId)}/conselhos/${id}`, payload);
  return data;
}

export async function excluirMembroConselho(entidadeId: string, id: string): Promise<void> {
  await http.delete(`${base(entidadeId)}/conselhos/${id}`);
}

export async function enviarAtaConselho(
  entidadeId: string,
  id: string,
  arquivo: File,
): Promise<MembroConselho> {
  const { data } = await http.post<MembroConselho>(
    `${base(entidadeId)}/conselhos/${id}/ata`,
    formDe(arquivo),
  );
  return data;
}

export const abrirAtaConselho = (entidadeId: string, id: string) =>
  abrirPdf(`${base(entidadeId)}/conselhos/${id}/ata`);

export async function removerAtaConselho(
  entidadeId: string,
  id: string,
): Promise<MembroConselho> {
  const { data } = await http.delete<MembroConselho>(`${base(entidadeId)}/conselhos/${id}/ata`);
  return data;
}

// ---- Regularidade fiscal / cadastral ----

export async function listarDocumentosRegularidade(
  entidadeId: string,
): Promise<DocumentoRegularidade[]> {
  const { data } = await http.get<DocumentoRegularidade[]>(`${base(entidadeId)}/regularidade`);
  return data;
}

export async function criarDocumentoRegularidade(
  entidadeId: string,
  payload: DocumentoRegularidadePayload,
): Promise<DocumentoRegularidade> {
  const { data } = await http.post<DocumentoRegularidade>(
    `${base(entidadeId)}/regularidade`,
    payload,
  );
  return data;
}

export async function atualizarDocumentoRegularidade(
  entidadeId: string,
  id: string,
  payload: DocumentoRegularidadePayload,
): Promise<DocumentoRegularidade> {
  const { data } = await http.put<DocumentoRegularidade>(
    `${base(entidadeId)}/regularidade/${id}`,
    payload,
  );
  return data;
}

export async function excluirDocumentoRegularidade(
  entidadeId: string,
  id: string,
): Promise<void> {
  await http.delete(`${base(entidadeId)}/regularidade/${id}`);
}

export async function enviarArquivoDocumento(
  entidadeId: string,
  id: string,
  arquivo: File,
): Promise<DocumentoRegularidade> {
  const { data } = await http.post<DocumentoRegularidade>(
    `${base(entidadeId)}/regularidade/${id}/arquivo`,
    formDe(arquivo),
  );
  return data;
}

export const abrirArquivoDocumento = (entidadeId: string, id: string) =>
  abrirPdf(`${base(entidadeId)}/regularidade/${id}/arquivo`);

export async function removerArquivoDocumento(
  entidadeId: string,
  id: string,
): Promise<DocumentoRegularidade> {
  const { data } = await http.delete<DocumentoRegularidade>(
    `${base(entidadeId)}/regularidade/${id}/arquivo`,
  );
  return data;
}

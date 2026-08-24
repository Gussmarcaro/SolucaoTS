import { http } from './http';
import type {
  DocumentoFiscal,
  DocumentoFiscalPayload,
  Pagamento,
  PagamentoPayload,
} from '@/types/prestacaoBlocos';

// ---- Documentos Fiscais ----
export async function listarDocumentosFiscais(prestacaoId: string): Promise<DocumentoFiscal[]> {
  const { data } = await http.get<DocumentoFiscal[]>(`/prestacoes/${prestacaoId}/documentos-fiscais`);
  return data;
}

export async function criarDocumentoFiscal(prestacaoId: string, payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> {
  const { data } = await http.post<DocumentoFiscal>(`/prestacoes/${prestacaoId}/documentos-fiscais`, payload);
  return data;
}

export async function atualizarDocumentoFiscal(prestacaoId: string, id: string, payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> {
  const { data } = await http.put<DocumentoFiscal>(`/prestacoes/${prestacaoId}/documentos-fiscais/${id}`, payload);
  return data;
}

export async function excluirDocumentoFiscal(prestacaoId: string, id: string): Promise<void> {
  await http.delete(`/prestacoes/${prestacaoId}/documentos-fiscais/${id}`);
}

/** Anexa a digitalização da nota. Reenviar substitui a anterior. */
export async function enviarArquivoDocumentoFiscal(
  prestacaoId: string,
  id: string,
  file: File,
): Promise<DocumentoFiscal> {
  const fd = new FormData();
  fd.append('arquivo', file);
  const { data } = await http.post<DocumentoFiscal>(
    `/prestacoes/${prestacaoId}/documentos-fiscais/${id}/arquivo`,
    fd,
  );
  return data;
}

export async function removerArquivoDocumentoFiscal(
  prestacaoId: string,
  id: string,
): Promise<DocumentoFiscal> {
  const { data } = await http.delete<DocumentoFiscal>(
    `/prestacoes/${prestacaoId}/documentos-fiscais/${id}/arquivo`,
  );
  return data;
}

/**
 * Abre a nota numa aba.
 *
 * Busca por `http` em vez de apontar um `<a href>` para a rota: o download
 * precisa do cabeçalho de autenticação, que um link simples não leva — e a
 * resposta seria um 401 em vez do PDF.
 */
export async function baixarArquivoDocumentoFiscal(
  prestacaoId: string,
  id: string,
): Promise<void> {
  const { data } = await http.get<Blob>(
    `/prestacoes/${prestacaoId}/documentos-fiscais/${id}/arquivo`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener');
  // Solta o objeto depois de a aba abrir; revogar na hora cancelaria a leitura.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---- Pagamentos ----
export async function listarPagamentos(prestacaoId: string): Promise<Pagamento[]> {
  const { data } = await http.get<Pagamento[]>(`/prestacoes/${prestacaoId}/pagamentos`);
  return data;
}

export async function criarPagamento(prestacaoId: string, payload: PagamentoPayload): Promise<Pagamento> {
  const { data } = await http.post<Pagamento>(`/prestacoes/${prestacaoId}/pagamentos`, payload);
  return data;
}

export async function atualizarPagamento(prestacaoId: string, id: string, payload: PagamentoPayload): Promise<Pagamento> {
  const { data } = await http.put<Pagamento>(`/prestacoes/${prestacaoId}/pagamentos/${id}`, payload);
  return data;
}

export async function excluirPagamento(prestacaoId: string, id: string): Promise<void> {
  await http.delete(`/prestacoes/${prestacaoId}/pagamentos/${id}`);
}

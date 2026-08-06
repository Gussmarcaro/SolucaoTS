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

import { http } from './http';
import type {
  DocumentoFiscal,
  DocumentoFiscalApropriado,
  Pagamento,
  PagamentoPayload,
} from '@/types/prestacaoBlocos';

/*
 * Só a leitura sobreviveu aqui, e tem dois consumidores: as abas de Glosas e
 * de Pagamentos, que listam as notas da prestação para ligar-se a elas.
 *
 * Criar, alterar e excluir a nota é em **Execução → Despesas**; ela chega à
 * prestação por `apropriarDocumento`. As funções que gravavam por esta rota
 * saíram junto com a tela que as usava: a nota criada por aqui não ganhava a
 * ligação de que o montador lê, e não chegava ao Tribunal.
 */
export async function listarDocumentosFiscais(prestacaoId: string): Promise<DocumentoFiscal[]> {
  const { data } = await http.get<DocumentoFiscal[]>(`/prestacoes/${prestacaoId}/documentos-fiscais`);
  return data;
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

// ---- Apropriação de documentos fiscais ----
//
// A nota é do órgão (Financeiro → Despesas); a prestação escolhe quais entram
// nela. O percentual do rateio é calculado no servidor, no momento da escolha —
// é lá que o ajuste fica conhecido.

export async function listarApropriados(prestacaoId: string): Promise<DocumentoFiscalApropriado[]> {
  const { data } = await http.get<DocumentoFiscalApropriado[]>(
    `/prestacoes/${prestacaoId}/documentos-fiscais/apropriados`,
  );
  return data;
}

export async function listarCandidatos(prestacaoId: string): Promise<DocumentoFiscal[]> {
  const { data } = await http.get<DocumentoFiscal[]>(
    `/prestacoes/${prestacaoId}/documentos-fiscais/candidatos`,
  );
  return data;
}

export async function apropriarDocumento(
  prestacaoId: string,
  documentoId: string,
  contratoId?: string | null,
): Promise<void> {
  await http.post(`/prestacoes/${prestacaoId}/documentos-fiscais/${documentoId}/apropriar`, {
    contratoId,
  });
}

export async function desapropriarDocumento(prestacaoId: string, documentoId: string): Promise<void> {
  await http.delete(`/prestacoes/${prestacaoId}/documentos-fiscais/${documentoId}/apropriar`);
}

// ---- Apropriação de pagamentos ----
export const pagamentosSelecao = {
  apropriados: (prestacaoId: string) => listarPagamentos(prestacaoId),
  candidatos: async (prestacaoId: string): Promise<Pagamento[]> => {
    const { data } = await http.get<Pagamento[]>(`/prestacoes/${prestacaoId}/pagamentos/candidatos`);
    return data;
  },
  apropriar: async (prestacaoId: string, id: string): Promise<void> => {
    await http.post(`/prestacoes/${prestacaoId}/pagamentos/${id}/apropriar`);
  },
  desapropriar: async (prestacaoId: string, id: string): Promise<void> => {
    await http.delete(`/prestacoes/${prestacaoId}/pagamentos/${id}/apropriar`);
  },
};

/** Uma rubrica do Plano de Aplicação e a Categoria de Despesa AUDESP dela. */
export interface RubricaDoPlano {
  categoria: string;
  subcategoria: string;
  /** Nula nos planos importados antes de o campo existir. */
  categoriaDespesaTipo: number | null;
}

import { http } from './http';
import type { DocumentoFiscal, DocumentoFiscalPayload } from '@/types/prestacaoBlocos';

/**
 * Despesas — os documentos fiscais do órgão.
 *
 * Rota própria, sem `prestacaoId`: a nota é lançada quando a despesa acontece,
 * e a prestação depois se apropria dela. É a mesma entidade que a aba da
 * prestação mostra, vista do escopo de cima.
 */
export const despesasApi = {
  /** Com `ajusteId`, as da parceria — inclusive as rateadas que a incluem. */
  listar: async (ajusteId?: string): Promise<DocumentoFiscal[]> => {
    const { data } = await http.get<DocumentoFiscal[]>('/despesas', {
      params: ajusteId ? { ajusteId } : undefined,
    });
    return data;
  },
  criar: async (payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> => {
    const { data } = await http.post<DocumentoFiscal>('/despesas', payload);
    return data;
  },
  atualizar: async (id: string, payload: DocumentoFiscalPayload): Promise<DocumentoFiscal> => {
    const { data } = await http.put<DocumentoFiscal>(`/despesas/${id}`, payload);
    return data;
  },
  excluir: async (id: string): Promise<void> => {
    await http.delete(`/despesas/${id}`);
  },
  /**
   * As rubricas do Plano de Aplicação, com a Categoria AUDESP de cada uma.
   *
   * **Com o ajuste, vem só o plano daquela parceria.** Sem ele era o órgão
   * inteiro: a tela oferecia a rubrica de qualquer convênio, mesma família de
   * erro que a lista de contas bancárias já teve. A tela de Despesas sempre o
   * envia, porque vive dentro do portão da Execução.
   */
  rubricas: async (ajusteId?: string): Promise<RubricaDoPlano[]> => {
    const { data } = await http.get<RubricaDoPlano[]>('/despesas/rubricas', {
      params: ajusteId ? { ajusteId } : undefined,
    });
    return data;
  },
};

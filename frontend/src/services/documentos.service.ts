import { http } from './http';
import type { Folha } from '@/types/documento';

/** ANEXO PC-02 — Termo de Consentimento (contas bancárias) do órgão logado. */
export async function termoConsentimento(): Promise<Folha> {
  const { data } = await http.get<Folha>('/orgaos/documentos/termo-consentimento');
  return data;
}

/**
 * Termo de Ciência e de Notificação do ajuste. Com `prestacaoId`, sai a versão
 * que instrui a prestação de contas (valor repassado e exercício).
 */
export async function termoCiencia(ajusteId: string, prestacaoId?: string): Promise<Folha> {
  const { data } = await http.get<Folha>(`/ajustes/${ajusteId}/documentos/termo-ciencia`, {
    params: { prestacaoId: prestacaoId || undefined },
  });
  return data;
}

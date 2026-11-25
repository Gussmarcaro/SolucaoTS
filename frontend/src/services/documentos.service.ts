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

/**
 * Demonstrativo Integral (RP-06/08/10/12) de uma prestação. `saldoAnterior`
 * substitui o saldo (A) calculado — formato `MUNICIPAL:1500,50;FEDERAL:0`.
 */
export async function demonstrativoIntegral(
  prestacaoId: string,
  saldoAnterior?: string,
): Promise<import('@/types/demonstrativo').DemonstrativoIntegral> {
  const { data } = await http.get(`/prestacoes/${prestacaoId}/documentos/demonstrativo-integral`, {
    params: { saldoAnterior: saldoAnterior || undefined },
  });
  return data;
}

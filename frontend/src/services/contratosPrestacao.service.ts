import { http } from './http';
import type { AjustesSaldo, ContratoPayload, ContratoPrestacao } from '@/types/prestacaoBlocos11';

const base = (prestacaoId: string) => `/prestacoes/${prestacaoId}/contratos`;

export const contratosApi = {
  listar: (prestacaoId: string) => http.get<ContratoPrestacao[]>(base(prestacaoId)).then((r) => r.data),
  criar: (prestacaoId: string, payload: ContratoPayload) => http.post<ContratoPrestacao>(base(prestacaoId), payload).then((r) => r.data),
  atualizar: (prestacaoId: string, id: string, payload: ContratoPayload) =>
    http.put<ContratoPrestacao>(`${base(prestacaoId)}/${id}`, payload).then((r) => r.data),
  excluir: (prestacaoId: string, id: string) => http.delete(`${base(prestacaoId)}/${id}`).then(() => undefined),
};

const baseAS = (prestacaoId: string) => `/prestacoes/${prestacaoId}/ajustes-saldo`;
export const ajustesSaldoApi = {
  obter: (prestacaoId: string) => http.get<AjustesSaldo | null>(baseAS(prestacaoId)).then((r) => r.data),
  salvar: (prestacaoId: string, payload: AjustesSaldo) => http.put<AjustesSaldo>(baseAS(prestacaoId), payload).then((r) => r.data),
};

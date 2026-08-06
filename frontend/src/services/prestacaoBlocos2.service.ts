import { http } from './http';
import type {
  Desconto,
  DescontoPayload,
  Devolucao,
  DevolucaoPayload,
  Disponibilidade,
  DisponibilidadePayload,
  Receita,
  ReceitaPayload,
} from '@/types/prestacaoBlocos2';

/** CRUD genérico de um bloco simples aninhado à prestação. */
function crud<T, P>(path: string) {
  const base = (prestacaoId: string) => `/prestacoes/${prestacaoId}/${path}`;
  return {
    listar: (prestacaoId: string) => http.get<T[]>(base(prestacaoId)).then((r) => r.data),
    criar: (prestacaoId: string, payload: P) => http.post<T>(base(prestacaoId), payload).then((r) => r.data),
    atualizar: (prestacaoId: string, id: string, payload: P) =>
      http.put<T>(`${base(prestacaoId)}/${id}`, payload).then((r) => r.data),
    excluir: (prestacaoId: string, id: string) => http.delete(`${base(prestacaoId)}/${id}`).then(() => undefined),
  };
}

import type {
  Empregado,
  EmpregadoPayload,
  Glosa,
  GlosaPayload,
} from '@/types/prestacaoBlocos3';

export const receitasApi = crud<Receita, ReceitaPayload>('receitas');
export const disponibilidadesApi = crud<Disponibilidade, DisponibilidadePayload>('disponibilidades');
export const descontosApi = crud<Desconto, DescontoPayload>('descontos');
export const devolucoesApi = crud<Devolucao, DevolucaoPayload>('devolucoes');
export const glosasApi = crud<Glosa, GlosaPayload>('glosas');
export const empregadosApi = crud<Empregado, EmpregadoPayload>('empregados');

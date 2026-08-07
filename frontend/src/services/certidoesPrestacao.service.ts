import { http } from './http';
import type {
  DadosGerais,
  DadosGeraisPayload,
  Responsaveis,
  ResponsaveisPayload,
} from '@/types/prestacaoBlocos7';

/** Bloco singleton (1:1 com a prestação): obter + salvar (upsert via PUT). */
function singleton<T, P>(path: string) {
  const base = (prestacaoId: string) => `/prestacoes/${prestacaoId}/${path}`;
  return {
    obter: (prestacaoId: string) => http.get<T | null>(base(prestacaoId)).then((r) => r.data),
    salvar: (prestacaoId: string, payload: P) => http.put<T>(base(prestacaoId), payload).then((r) => r.data),
  };
}

export const dadosGeraisApi = singleton<DadosGerais, DadosGeraisPayload>('dados-gerais');
export const responsaveisApi = singleton<Responsaveis, ResponsaveisPayload>('responsaveis');

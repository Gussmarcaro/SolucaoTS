import { http } from './http';
import type { Declaracoes, Parecer, Transparencia } from '@/types/prestacaoBlocos8';

function singleton<T>(path: string) {
  const base = (prestacaoId: string) => `/prestacoes/${prestacaoId}/${path}`;
  return {
    obter: (prestacaoId: string) => http.get<T | null>(base(prestacaoId)).then((r) => r.data),
    salvar: (prestacaoId: string, payload: T) => http.put<T>(base(prestacaoId), payload).then((r) => r.data),
  };
}

export const declaracoesApi = singleton<Declaracoes>('declaracoes');
export const parecerApi = singleton<Parecer>('parecer-conclusivo');
export const transparenciaApi = singleton<Transparencia>('transparencia');

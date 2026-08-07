import { http } from './http';
import type {
  Demonstracoes,
  PrestacaoEntidade,
  PublicacaoParecerAta,
  PublicacaoRelAtividades,
} from '@/types/prestacaoBlocos9';

function singleton<T>(path: string) {
  const base = (prestacaoId: string) => `/prestacoes/${prestacaoId}/${path}`;
  return {
    obter: (prestacaoId: string) => http.get<T | null>(base(prestacaoId)).then((r) => r.data),
    salvar: (prestacaoId: string, payload: T) => http.put<T>(base(prestacaoId), payload).then((r) => r.data),
  };
}

export const demonstracoesApi = singleton<Demonstracoes>('demonstracoes-contabeis');
export const publicacaoParecerAtaApi = singleton<PublicacaoParecerAta>('publicacao-parecer-ata');
export const publicacaoRelAtividadesApi = singleton<PublicacaoRelAtividades>('publicacao-rel-atividades');
export const prestacaoEntidadeApi = singleton<PrestacaoEntidade>('prestacao-entidade');

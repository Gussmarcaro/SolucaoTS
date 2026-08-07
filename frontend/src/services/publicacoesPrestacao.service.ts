import { http } from './http';
import type {
  Demonstracoes,
  PrestacaoEntidade,
  PublicacaoParecerAta,
  PublicacaoRelAtividades,
} from '@/types/prestacaoBlocos9';
import type { Extrato, RegulamentoCompras, RelatorioFinal, TermoBens } from '@/types/prestacaoBlocos10';

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
export const relatorioFinalApi = singleton<RelatorioFinal>('relatorio-final');
export const regulamentoComprasApi = singleton<RegulamentoCompras>('regulamento-compras');
export const extratoApi = singleton<Extrato>('extrato-fisico-financeiro');
export const termoBensApi = singleton<TermoBens>('termo-bens-cedidos');

import type { Rateio } from '@/core/rateio/Rateio';
import type { DadosRateio, FiltrosRateio } from './dtos';

export interface ListarRateiosParams {
  filtros: FiltrosRateio;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PaginaRateios {
  data: Rateio[];
  total: number;
}

/** Port de persistência de Rateio. */
export interface IRateioRepository {
  listar(params: ListarRateiosParams): Promise<PaginaRateios>;
  buscarPorId(id: string): Promise<Rateio | null>;
  criar(dados: DadosRateio): Promise<Rateio>;
  atualizar(id: string, dados: DadosRateio): Promise<Rateio>;
  definirAtivo(id: string, ativo: boolean): Promise<Rateio>;
  excluir(id: string): Promise<void>;
  /** Ids de ajuste que existem — recusa participante inventado. */
  ajustesExistentes(ids: string[]): Promise<string[]>;
  /** Ajustes vigentes na data, para o carregamento automático. */
  ajustesVigentes(em: Date): Promise<{ id: string }[]>;
}

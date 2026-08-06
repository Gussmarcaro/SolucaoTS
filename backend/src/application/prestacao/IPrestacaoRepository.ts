import type { Prestacao } from '@/core/prestacao/Prestacao';
import type { DadosCriarPrestacao, ListarPrestacoesParams, Paginado } from './dtos';

/** Port de persistência de Prestação de Contas. */
export interface IPrestacaoRepository {
  buscarPorId(id: string): Promise<Prestacao | null>;
  buscarPorAjusteAno(ajusteId: string, ano: number): Promise<Prestacao | null>;
  criar(dados: DadosCriarPrestacao): Promise<Prestacao>;
  excluir(id: string): Promise<void>;
  listar(params: ListarPrestacoesParams): Promise<Paginado<Prestacao>>;
}

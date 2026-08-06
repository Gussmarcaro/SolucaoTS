import type { Devolucao } from '@/core/devolucao/Devolucao';
import type { DadosDevolucao } from './dtos';

/** Port de persistência de Devolução (no escopo de uma Prestação). */
export interface IDevolucaoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Devolucao[]>;
  buscarPorId(id: string): Promise<Devolucao | null>;
  criar(prestacaoId: string, dados: DadosDevolucao): Promise<Devolucao>;
  atualizar(id: string, dados: DadosDevolucao): Promise<Devolucao>;
  excluir(id: string): Promise<void>;
}

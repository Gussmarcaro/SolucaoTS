import type { Pagamento } from '@/core/pagamento/Pagamento';
import type { DadosPagamento } from './dtos';

/** Port de persistência de Pagamento (no escopo de uma Prestação). */
export interface IPagamentoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Pagamento[]>;
  buscarPorId(id: string): Promise<Pagamento | null>;
  docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean>;
  criar(prestacaoId: string, dados: DadosPagamento): Promise<Pagamento>;
  atualizar(id: string, dados: DadosPagamento): Promise<Pagamento>;
  excluir(id: string): Promise<void>;
}

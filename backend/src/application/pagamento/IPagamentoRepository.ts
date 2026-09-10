import type { Pagamento } from '@/core/pagamento/Pagamento';
import type { DadosPagamento } from './dtos';

/** Port de persistência de Pagamento (no escopo de uma Prestação). */
export interface IPagamentoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Pagamento[]>;
  /**
   * Todos os lançamentos do órgão — a tela de Execução → Financeiro.
   *
   * Sem parâmetro de órgão: quem recorta é a extension de tenant, na camada de
   * dados. Passá-lo aqui daria a impressão de que o recorte é escolha de quem
   * chama — e é justamente o contrário.
   */
  listarDoOrgao(): Promise<Pagamento[]>;
  /** Cria no escopo do órgão; `clienteId` é carimbado pela extension. */
  criarNoOrgao(dados: DadosPagamento): Promise<Pagamento>;
  buscarPorId(id: string): Promise<Pagamento | null>;
  docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean>;
  criar(prestacaoId: string, dados: DadosPagamento): Promise<Pagamento>;
  atualizar(id: string, dados: DadosPagamento): Promise<Pagamento>;
  excluir(id: string): Promise<void>;
}

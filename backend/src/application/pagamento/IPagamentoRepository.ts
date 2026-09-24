import type { Pagamento } from '@/core/pagamento/Pagamento';
import type { DadosPagamento } from './dtos';

/** Port de persistência de Pagamento (no escopo de uma Prestação). */
export interface IPagamentoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Pagamento[]>;
  /**
   * Pagamentos do órgão que esta prestação **poderia** apropriar.
   *
   * Duas condições, e cada uma evita um erro distinto:
   *
   * - **ainda sem prestação** — o já apropriado por outra não pode
   *   entrar aqui, senão o mesmo dinheiro apareceria em duas prestações;
   * - **do ajuste desta prestação, ou sem ajuste definido** — lançamento de
   *   outra parceria não pertence a esta prestação, e incluí-lo passaria
   *   despercebido. O "sem ajuste" entra porque a tela do Financeiro permite
   *   lançar antes de saber a parceria, e a apropriação é que a define.
   */
  listarCandidatos(ajusteId: string, ano: number): Promise<Pagamento[]>;

  /** Inclui na prestação, carimbando também o ajuste. */
  apropriar(id: string, prestacaoId: string, ajusteId: string): Promise<void>;

  /** Retira da prestação. O lançamento continua existindo no órgão. */
  desapropriar(id: string): Promise<void>;
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
  /**
   * Quanto a nota já tem pago, somando todos os lançamentos dela.
   *
   * A nota pode ser paga em parcelas, então o teto é sobre a **soma**, não
   * sobre cada pagamento. `ignorarId` existe para a edição: sem ele, alterar
   * um pagamento contaria o valor antigo e o novo ao mesmo tempo, e uma
   * correção de centavos seria recusada.
   */
  somaPagaDaNota(documentoFiscalId: string, ignorarId?: string): Promise<number>;
  docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean>;
  criar(prestacaoId: string, dados: DadosPagamento): Promise<Pagamento>;
  atualizar(id: string, dados: DadosPagamento): Promise<Pagamento>;
  /**
   * Busca da barra superior — poucos, já recortados pelo órgão.
   *
   * Diferente dos outros três, **não precisa de `buscaTexto`**: o pagamento
   * não tem texto livre. O que se procura nele é o número da transação, que já
   * é uma coluna própria.
   */
  buscarGlobal(termo: string, limite: number): Promise<Pagamento[]>;
  excluir(id: string): Promise<void>;
}

import type { Receita } from '@/core/receita/Receita';
import type { DadosReceita } from './dtos';

/** Port de persistência de Receita (no escopo de uma Prestação). */
export interface IReceitaRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Receita[]>;
  /**
   * Receitas do órgão que esta prestação **poderia** apropriar.
   *
   * Duas condições, e cada uma evita um erro distinto:
   *
   * - **ainda sem prestação** — a já apropriada por outra não pode
   *   entrar aqui, senão o mesmo dinheiro apareceria em duas prestações;
   * - **do ajuste desta prestação, ou sem ajuste definido** — lançamento de
   *   outra parceria não pertence a esta prestação, e incluí-lo passaria
   *   despercebido. O "sem ajuste" entra porque a tela do Financeiro permite
   *   lançar antes de saber a parceria, e a apropriação é que a define.
   */
  listarCandidatos(ajusteId: string, ano: number): Promise<Receita[]>;

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
  listarDoOrgao(): Promise<Receita[]>;
  /** Cria no escopo do órgão; `clienteId` é carimbado pela extension. */
  criarNoOrgao(dados: DadosReceita): Promise<Receita>;
  buscarPorId(id: string): Promise<Receita | null>;
  criar(prestacaoId: string, dados: DadosReceita): Promise<Receita>;
  atualizar(id: string, dados: DadosReceita): Promise<Receita>;
  excluir(id: string): Promise<void>;
}

import type { Receita } from '@/core/receita/Receita';
import type { DadosReceita } from './dtos';

/** Port de persistência de Receita (no escopo de uma Prestação). */
export interface IReceitaRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Receita[]>;
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

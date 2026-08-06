import type { Receita } from '@/core/receita/Receita';
import type { DadosReceita } from './dtos';

/** Port de persistência de Receita (no escopo de uma Prestação). */
export interface IReceitaRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Receita[]>;
  buscarPorId(id: string): Promise<Receita | null>;
  criar(prestacaoId: string, dados: DadosReceita): Promise<Receita>;
  atualizar(id: string, dados: DadosReceita): Promise<Receita>;
  excluir(id: string): Promise<void>;
}

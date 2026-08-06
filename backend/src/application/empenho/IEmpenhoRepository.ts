import type { Empenho } from '@/core/empenho/Empenho';
import type { DadosEmpenho } from './dtos';

/** Port de persistência de Empenho (sempre no escopo de um Ajuste). */
export interface IEmpenhoRepository {
  listarPorAjuste(ajusteId: string): Promise<Empenho[]>;
  buscarPorId(id: string): Promise<Empenho | null>;
  buscarDuplicado(ajusteId: string, numeroEmpenho: string, anoEmpenho: number): Promise<Empenho | null>;
  criar(ajusteId: string, dados: DadosEmpenho): Promise<Empenho>;
  atualizar(id: string, dados: DadosEmpenho): Promise<Empenho>;
  excluir(id: string): Promise<void>;
}

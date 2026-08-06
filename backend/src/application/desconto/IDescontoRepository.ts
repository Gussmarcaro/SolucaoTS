import type { Desconto } from '@/core/desconto/Desconto';
import type { DadosDesconto } from './dtos';

/** Port de persistência de Desconto (no escopo de uma Prestação). */
export interface IDescontoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Desconto[]>;
  buscarPorId(id: string): Promise<Desconto | null>;
  criar(prestacaoId: string, dados: DadosDesconto): Promise<Desconto>;
  atualizar(id: string, dados: DadosDesconto): Promise<Desconto>;
  excluir(id: string): Promise<void>;
}

import type { Repasse } from '@/core/repasse/Repasse';
import type { DadosRepasse } from './dtos';

/** Port de persistência de Repasse (no escopo de uma Prestação). */
export interface IRepasseRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Repasse[]>;
  buscarPorId(id: string): Promise<Repasse | null>;
  /** Soma dos valores repassados de um empenho (para a trava soma ≤ valor). */
  somaRepassesEmpenho(empenhoId: string, ignorarId?: string): Promise<number>;
  criar(prestacaoId: string, dados: DadosRepasse): Promise<Repasse>;
  atualizar(id: string, dados: DadosRepasse): Promise<Repasse>;
  excluir(id: string): Promise<void>;
}

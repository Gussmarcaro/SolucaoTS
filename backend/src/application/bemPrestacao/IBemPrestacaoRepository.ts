import type { BemPrestacao } from '@/core/bemPrestacao/BemPrestacao';
import type { DadosBemPrestacao } from './dtos';

/** Port de persistência de Bem da prestação (no escopo de uma Prestação). */
export interface IBemPrestacaoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<BemPrestacao[]>;
  buscarPorId(id: string): Promise<BemPrestacao | null>;
  criar(prestacaoId: string, dados: DadosBemPrestacao): Promise<BemPrestacao>;
  atualizar(id: string, dados: DadosBemPrestacao): Promise<BemPrestacao>;
  excluir(id: string): Promise<void>;
}

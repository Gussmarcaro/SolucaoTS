import type { ContratoPrestacao } from '@/core/contratoPrestacao/ContratoPrestacao';
import type { DadosContrato } from './dtos';

/** Port de persistência de Contrato (no escopo de uma Prestação). */
export interface IContratoPrestacaoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<ContratoPrestacao[]>;
  buscarPorId(id: string): Promise<ContratoPrestacao | null>;
  criar(prestacaoId: string, dados: DadosContrato): Promise<ContratoPrestacao>;
  atualizar(id: string, dados: DadosContrato): Promise<ContratoPrestacao>;
  excluir(id: string): Promise<void>;
}

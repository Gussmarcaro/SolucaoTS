import type { EmpenhoPrestacao } from '@/core/empenhoPrestacao/EmpenhoPrestacao';
import type { DadosEmpenhoPrestacao } from './dtos';

/** Port de persistência de Empenho (no escopo de uma Prestação). */
export interface IEmpenhoPrestacaoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<EmpenhoPrestacao[]>;
  buscarPorId(id: string): Promise<EmpenhoPrestacao | null>;
  buscarDuplicado(prestacaoId: string, numero: string, dataEmissao: Date): Promise<EmpenhoPrestacao | null>;
  criar(prestacaoId: string, dados: DadosEmpenhoPrestacao): Promise<EmpenhoPrestacao>;
  atualizar(id: string, dados: DadosEmpenhoPrestacao): Promise<EmpenhoPrestacao>;
  excluir(id: string): Promise<void>;
}

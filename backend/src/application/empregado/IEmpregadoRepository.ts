import type { Empregado } from '@/core/empregado/Empregado';
import type { DadosEmpregado } from './dtos';

/** Port de persistência de Empregado (no escopo de uma Prestação). */
export interface IEmpregadoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Empregado[]>;
  buscarPorId(id: string): Promise<Empregado | null>;
  buscarDuplicado(prestacaoId: string, cpf: string, dataAdmissao: Date): Promise<Empregado | null>;
  criar(prestacaoId: string, dados: DadosEmpregado): Promise<Empregado>;
  atualizar(id: string, dados: DadosEmpregado): Promise<Empregado>;
  excluir(id: string): Promise<void>;
}

import type { ServidorPrestacao } from '@/core/servidorPrestacao/ServidorPrestacao';
import type { DadosServidorPrestacao } from './dtos';

/** Port de persistência de Servidor Cedido (no escopo de uma Prestação). */
export interface IServidorPrestacaoRepository {
  listarPorPrestacao(prestacaoId: string): Promise<ServidorPrestacao[]>;
  buscarPorId(id: string): Promise<ServidorPrestacao | null>;
  buscarDuplicado(prestacaoId: string, cpf: string, dataInicialCessao: Date): Promise<ServidorPrestacao | null>;
  criar(prestacaoId: string, dados: DadosServidorPrestacao): Promise<ServidorPrestacao>;
  atualizar(id: string, dados: DadosServidorPrestacao): Promise<ServidorPrestacao>;
  excluir(id: string): Promise<void>;
}

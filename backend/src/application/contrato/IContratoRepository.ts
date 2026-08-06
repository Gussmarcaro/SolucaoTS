import type { Contrato } from '@/core/contrato/Contrato';
import type { DadosContrato, ListarContratosParams, Paginado } from './dtos';

/** Port de persistência de Contrato firmado. */
export interface IContratoRepository {
  buscarPorId(id: string): Promise<Contrato | null>;
  buscarPorNumeroCredor(numero: string, credorDocumento: string): Promise<Contrato | null>;
  criar(dados: DadosContrato): Promise<Contrato>;
  atualizar(id: string, dados: DadosContrato): Promise<Contrato>;
  definirAtivo(id: string, ativo: boolean): Promise<Contrato>;
  listar(params: ListarContratosParams): Promise<Paginado<Contrato>>;
}

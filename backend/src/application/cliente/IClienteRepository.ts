import type { Cliente } from '@/core/cliente/Cliente';
import type { DadosCliente, ListarClientesParams, Paginado } from './dtos';

/** Port de persistência de Órgão (Cliente). */
export interface IClienteRepository {
  buscarPorId(id: string): Promise<Cliente | null>;
  buscarPorCnpj(cnpj: string): Promise<Cliente | null>;
  buscarPorCodigos(codigoMunicipio: number, codigoEntidade: number): Promise<Cliente | null>;
  criar(dados: DadosCliente): Promise<Cliente>;
  atualizar(id: string, dados: DadosCliente): Promise<Cliente>;
  definirAtivo(id: string, ativo: boolean): Promise<Cliente>;
  listar(params: ListarClientesParams): Promise<Paginado<Cliente>>;
}

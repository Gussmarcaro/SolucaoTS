import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import type { DadosServidorCedido, ListarServidoresCedidosParams, Paginado } from './dtos';

/** Port de persistência de Servidor Cedido. */
export interface IServidorCedidoRepository {
  buscarPorId(id: string): Promise<ServidorCedido | null>;
  buscarPorCpf(cpf: string): Promise<ServidorCedido | null>;
  criar(dados: DadosServidorCedido): Promise<ServidorCedido>;
  atualizar(id: string, dados: DadosServidorCedido): Promise<ServidorCedido>;
  definirAtivo(id: string, ativo: boolean): Promise<ServidorCedido>;
  listar(params: ListarServidoresCedidosParams): Promise<Paginado<ServidorCedido>>;
}

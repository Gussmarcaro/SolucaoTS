import type { BemCedido } from '@/core/bemCedido/BemCedido';
import type { DadosBemCedido, ListarBensCedidosParams, Paginado } from './dtos';

/** Port de persistência de Bem Cedido. */
export interface IBemCedidoRepository {
  buscarPorId(id: string): Promise<BemCedido | null>;
  buscarPorIdentificador(identificador: string): Promise<BemCedido | null>;
  criar(dados: DadosBemCedido): Promise<BemCedido>;
  atualizar(id: string, dados: DadosBemCedido): Promise<BemCedido>;
  definirAtivo(id: string, ativo: boolean): Promise<BemCedido>;
  listar(params: ListarBensCedidosParams): Promise<Paginado<BemCedido>>;
}

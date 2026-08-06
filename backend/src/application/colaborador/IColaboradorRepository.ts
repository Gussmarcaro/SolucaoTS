import type { Colaborador } from '@/core/colaborador/Colaborador';
import type { DadosColaborador, ListarColaboradoresParams, Paginado } from './dtos';

/** Port de persistência de Colaborador / Empregado. */
export interface IColaboradorRepository {
  buscarPorId(id: string): Promise<Colaborador | null>;
  buscarPorCpf(cpf: string): Promise<Colaborador | null>;
  criar(dados: DadosColaborador): Promise<Colaborador>;
  atualizar(id: string, dados: DadosColaborador): Promise<Colaborador>;
  definirAtivo(id: string, ativo: boolean): Promise<Colaborador>;
  listar(params: ListarColaboradoresParams): Promise<Paginado<Colaborador>>;
}

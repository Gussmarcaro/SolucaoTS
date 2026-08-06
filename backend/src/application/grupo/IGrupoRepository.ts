import type { Grupo, GrupoResumo } from '@/core/grupo/Grupo';
import type { DadosGrupo, ListarGruposParams, Paginado } from './dtos';

/** Port de persistência de Grupo de Usuários. */
export interface IGrupoRepository {
  buscarPorId(id: string): Promise<Grupo | null>;
  buscarPorNome(nome: string): Promise<Grupo | null>;
  contarMembros(id: string): Promise<number>;
  criar(dados: DadosGrupo): Promise<Grupo>;
  atualizar(id: string, dados: DadosGrupo): Promise<Grupo>;
  definirAtivo(id: string, ativo: boolean): Promise<Grupo>;
  excluir(id: string): Promise<void>;
  listar(params: ListarGruposParams): Promise<Paginado<Grupo>>;
  listarAtivos(): Promise<GrupoResumo[]>;
}

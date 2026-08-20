import type { Compromisso, ResumoAgenda } from '@/core/compromisso/Compromisso';
import type { DadosCompromisso, ListarCompromissosParams, Paginado } from './dtos';

/** Port de persistência de Compromisso. */
export interface ICompromissoRepository {
  buscarPorId(id: string): Promise<Compromisso | null>;
  criar(dados: DadosCompromisso): Promise<Compromisso>;
  atualizar(id: string, dados: DadosCompromisso): Promise<Compromisso>;
  excluir(id: string): Promise<void>;
  listar(params: ListarCompromissosParams): Promise<Paginado<Compromisso>>;
  resumo(agora: Date): Promise<ResumoAgenda>;
  ajusteExiste(ajusteId: string): Promise<boolean>;
  usuarioExiste(usuarioId: string): Promise<boolean>;
  /** Quantas tarefas nasceram deste compromisso — trava a exclusão. */
  contarTarefas(id: string): Promise<number>;
}

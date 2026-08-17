import type { ResumoTarefas, Tarefa } from '@/core/tarefa/Tarefa';
import type { DadosTarefa, ListarTarefasParams, Paginado } from './dtos';

/** Port de persistência de Tarefa. */
export interface ITarefaRepository {
  buscarPorId(id: string): Promise<Tarefa | null>;
  /** Tarefa não cancelada nascida de um alerta — evita duplicar no sino. */
  buscarPorOrigemAlerta(origemAlerta: string): Promise<Tarefa | null>;
  criar(dados: DadosTarefa): Promise<Tarefa>;
  atualizar(id: string, dados: DadosTarefa): Promise<Tarefa>;
  excluir(id: string): Promise<void>;
  listar(params: ListarTarefasParams): Promise<Paginado<Tarefa>>;
  /** Contagens da tela e do dashboard, sem trazer as linhas. */
  resumo(hoje: string): Promise<ResumoTarefas>;
  /** O ajuste existe? Vínculo apontando para o nada estraga a grade. */
  ajusteExiste(ajusteId: string): Promise<boolean>;
  usuarioExiste(usuarioId: string): Promise<boolean>;
}

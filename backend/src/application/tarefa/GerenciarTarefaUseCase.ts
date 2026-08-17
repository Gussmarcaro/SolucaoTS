import type { StatusTarefa, Tarefa } from '@/core/tarefa/Tarefa';
import { STATUS } from '@/core/tarefa/Tarefa';
import { BusinessError, NotFoundError } from '@/shared/errors';
import type { ITarefaRepository } from './ITarefaRepository';

/** Casos de uso pontuais: buscar, mudar status e excluir. */
export class GerenciarTarefaUseCase {
  constructor(private readonly repo: ITarefaRepository) {}

  async buscar(id: string): Promise<Tarefa> {
    const tarefa = await this.repo.buscarPorId(id);
    if (!tarefa) throw new NotFoundError('Tarefa não encontrada.');
    return tarefa;
  }

  /**
   * Muda só o status — é a ação de um clique na grade.
   *
   * Existe separada da edição porque o caminho comum do módulo é "concluí
   * isto", não "reabrir o formulário inteiro para trocar um campo". E a data
   * de conclusão é decidida aqui, não pelo cliente.
   */
  async definirStatus(id: string, status: string): Promise<Tarefa> {
    const atual = await this.buscar(id);
    if (!STATUS.includes(status as StatusTarefa)) throw new BusinessError('Status inválido.');
    const novo = status as StatusTarefa;

    const concluidaEm =
      novo === 'CONCLUIDA' ? (atual.concluidaEm ?? new Date()) : null;

    return this.repo.atualizar(id, {
      titulo: atual.titulo,
      descricao: atual.descricao,
      prioridade: atual.prioridade,
      status: novo,
      prazoLegal: new Date(`${atual.prazoLegal}T00:00:00.000Z`),
      ajusteId: atual.ajusteId,
      responsavelId: atual.responsavelId,
      origemAlerta: atual.origemAlerta,
      concluidaEm,
    });
  }

  async excluir(id: string): Promise<void> {
    await this.buscar(id);
    await this.repo.excluir(id);
  }
}

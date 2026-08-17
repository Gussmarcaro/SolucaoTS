import type { Tarefa } from '@/core/tarefa/Tarefa';
import { BusinessError, NotFoundError } from '@/shared/errors';
import type { ITarefaRepository } from './ITarefaRepository';
import type { AtualizarTarefaDTO } from './dtos';
import { normalizarEValidarTarefa } from './validarTarefa';

export class AtualizarTarefaUseCase {
  constructor(private readonly repo: ITarefaRepository) {}

  async execute(id: string, input: AtualizarTarefaDTO): Promise<Tarefa> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Tarefa não encontrada.');

    const dados = normalizarEValidarTarefa(
      // A origem no sino é imutável: é o vínculo que faz o alerta reconhecer
      // esta tarefa. Se o payload pudesse trocá-la, uma edição de texto
      // desligaria a tarefa do prazo que ela existe para atender.
      { ...input, origemAlerta: atual.origemAlerta },
      { status: atual.status, concluidaEm: atual.concluidaEm },
    );

    if (dados.ajusteId && !(await this.repo.ajusteExiste(dados.ajusteId)))
      throw new BusinessError('Ajuste não encontrado.');
    if (dados.responsavelId && !(await this.repo.usuarioExiste(dados.responsavelId)))
      throw new BusinessError('Responsável não encontrado.');

    return this.repo.atualizar(id, dados);
  }
}

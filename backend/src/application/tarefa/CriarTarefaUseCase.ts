import type { Tarefa } from '@/core/tarefa/Tarefa';
import { BusinessError } from '@/shared/errors';
import type { ITarefaRepository } from './ITarefaRepository';
import type { CriarTarefaDTO } from './dtos';
import { normalizarEValidarTarefa } from './validarTarefa';

export class CriarTarefaUseCase {
  constructor(private readonly repo: ITarefaRepository) {}

  async execute(input: CriarTarefaDTO): Promise<Tarefa> {
    const dados = normalizarEValidarTarefa(input);

    /*
     * Tarefa nascida de alerta é idempotente.
     *
     * O sino é consultado por várias telas e o botão "gerar tarefa" fica a um
     * clique; sem isto, dois cliques (ou duas abas) viram duas tarefas para o
     * mesmo prazo, e a lista de acompanhamento passa a mostrar trabalho que
     * não existe. Devolver a que já existe é o comportamento correto: quem
     * pediu queria *ter* a tarefa, não criar outra.
     */
    if (dados.origemAlerta) {
      const existente = await this.repo.buscarPorOrigemAlerta(dados.origemAlerta);
      if (existente) return existente;
    }

    await this.conferirVinculos(dados.ajusteId, dados.responsavelId);
    return this.repo.criar(dados);
  }

  /** Vínculo apontando para registro inexistente estraga a grade em silêncio. */
  private async conferirVinculos(ajusteId: string | null, responsavelId: string | null) {
    if (ajusteId && !(await this.repo.ajusteExiste(ajusteId)))
      throw new BusinessError('Ajuste não encontrado.');
    if (responsavelId && !(await this.repo.usuarioExiste(responsavelId)))
      throw new BusinessError('Responsável não encontrado.');
  }
}

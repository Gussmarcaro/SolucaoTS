import type { Compromisso, ResumoAgenda, StatusCompromisso } from '@/core/compromisso/Compromisso';
import { STATUS } from '@/core/compromisso/Compromisso';
import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
import { BusinessError, NotFoundError } from '@/shared/errors';
import type { ICompromissoRepository } from './ICompromissoRepository';
import type {
  AtualizarCompromissoDTO,
  CriarCompromissoDTO,
  FiltrosCompromisso,
  Paginado,
} from './dtos';
import { normalizarEValidarCompromisso } from './validarCompromisso';

export class CompromissoUseCases {
  constructor(private readonly repo: ICompromissoRepository) {}

  private async conferirVinculos(ajusteId: string | null, responsavelId: string | null) {
    if (ajusteId && !(await this.repo.ajusteExiste(ajusteId)))
      throw new BusinessError('Ajuste não encontrado.');
    if (responsavelId && !(await this.repo.usuarioExiste(responsavelId)))
      throw new BusinessError('Responsável não encontrado.');
  }

  async buscar(id: string): Promise<Compromisso> {
    const c = await this.repo.buscarPorId(id);
    if (!c) throw new NotFoundError('Compromisso não encontrado.');
    return c;
  }

  async criar(input: CriarCompromissoDTO): Promise<Compromisso> {
    const dados = normalizarEValidarCompromisso(input);
    await this.conferirVinculos(dados.ajusteId, dados.responsavelId);
    return this.repo.criar(dados);
  }

  async atualizar(id: string, input: AtualizarCompromissoDTO): Promise<Compromisso> {
    await this.buscar(id);
    const dados = normalizarEValidarCompromisso(input);
    await this.conferirVinculos(dados.ajusteId, dados.responsavelId);
    return this.repo.atualizar(id, dados);
  }

  /**
   * Muda só a situação — é o clique de "realizado" ou "cancelado" na agenda.
   *
   * Voltar de REALIZADO para AGENDADO **apaga o registro**: uma ata de reunião
   * que o sistema voltou a considerar não realizada seria um documento sem
   * evento. Quem remarca cria outro compromisso; quem corrigiu por engano
   * digita de novo, e a trilha de auditoria guarda o texto anterior.
   */
  async definirStatus(id: string, status: string): Promise<Compromisso> {
    const atual = await this.buscar(id);
    if (!STATUS.includes(status as StatusCompromisso)) throw new BusinessError('Situação inválida.');
    const novo = status as StatusCompromisso;

    return this.repo.atualizar(id, {
      tipo: atual.tipo,
      titulo: atual.titulo,
      pauta: atual.pauta,
      inicioEm: new Date(atual.inicioEm),
      duracaoMinutos: atual.duracaoMinutos,
      local: atual.local,
      participantes: atual.participantes,
      ajusteId: atual.ajusteId,
      responsavelId: atual.responsavelId,
      status: novo,
      registro: novo === 'REALIZADO' ? atual.registro : null,
    });
  }

  /**
   * Excluir só o que não deixou rastro.
   *
   * Compromisso que gerou providências é a origem delas: apagá-lo deixaria as
   * tarefas apontando para o nada, e a pergunta "de onde saiu esta pendência?"
   * sem resposta. Para tirar da agenda sem perder o histórico, o caminho é
   * **Cancelado**.
   */
  async excluir(id: string): Promise<void> {
    await this.buscar(id);
    const tarefas = await this.repo.contarTarefas(id);
    if (tarefas > 0)
      throw new BusinessError(
        `Este compromisso originou ${tarefas} tarefa(s) e não pode ser excluído. ` +
          'Use a situação Cancelado para tirá-lo da agenda sem perder o histórico.',
      );
    await this.repo.excluir(id);
  }

  async listar(params: {
    filtros?: Record<string, unknown>;
    busca?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Compromisso>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const e = params.filtros ?? {};
    const filtros: FiltrosCompromisso = {};
    const tipo = String(e.tipo ?? '').trim();
    if (tipo) filtros.tipo = tipo as never;
    const status = String(e.status ?? '').trim();
    if (STATUS.includes(status as StatusCompromisso)) filtros.status = status as never;
    if (typeof e.ajusteId === 'string' && e.ajusteId.trim()) filtros.ajusteId = e.ajusteId.trim();
    if (typeof e.responsavelId === 'string' && e.responsavelId.trim())
      filtros.responsavelId = e.responsavelId.trim();
    if (e.pendentesDeRegistro === true) filtros.pendentesDeRegistro = true;

    const data = (v: unknown): Date | undefined => {
      const d = new Date(String(v ?? ''));
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    filtros.de = data(e.de);
    filtros.ate = data(e.ate);

    return this.repo.listar({ filtros, busca: params.busca?.trim() || undefined, page, pageSize });
  }

  resumo(agora = new Date()): Promise<ResumoAgenda> {
    return this.repo.resumo(agora);
  }
}

import type { Compromisso, ResumoAgenda, StatusCompromisso } from '@/core/compromisso/Compromisso';
import { STATUS } from '@/core/compromisso/Compromisso';
import { podeAlterar, type Espectador } from '@/core/compromisso/visibilidade';
import { AppError, BusinessError, NotFoundError } from '@/shared/errors';
import type { ICompromissoRepository } from './ICompromissoRepository';
import type { AtualizarCompromissoDTO, CriarCompromissoDTO, FiltrosCompromisso } from './dtos';
import { normalizarEValidarCompromisso } from './validarCompromisso';

/** Teto de linhas por consulta — a agenda pede uma janela, não o histórico. */
const LIMITE_JANELA = 1000;
/** Janela máxima aceita, em dias. Acima disso é varredura, não agenda. */
const JANELA_MAX_DIAS = 92;

export class CompromissoUseCases {
  constructor(private readonly repo: ICompromissoRepository) {}

  /** Monta o espectador a partir do usuário logado. */
  async espectador(usuarioId: string): Promise<Espectador> {
    return { usuarioId, grupoId: await this.repo.grupoDoUsuario(usuarioId) };
  }

  private async conferirVinculos(dados: {
    ajusteId: string | null;
    responsavelId: string | null;
    participantes: string[];
    grupos: string[];
  }) {
    if (dados.ajusteId && !(await this.repo.ajusteExiste(dados.ajusteId)))
      throw new BusinessError('Ajuste não encontrado.');
    const usuarios = [...dados.participantes];
    if (dados.responsavelId) usuarios.push(dados.responsavelId);
    if (usuarios.length && !(await this.repo.usuariosExistem(usuarios)))
      throw new BusinessError('Há participante ou responsável inexistente.');
    if (dados.grupos.length && !(await this.repo.gruposExistem(dados.grupos)))
      throw new BusinessError('Há grupo inexistente.');
  }

  /**
   * Busca um compromisso, já recortado pela visibilidade.
   *
   * Não existe e "não é seu" devolvem a **mesma** resposta, de propósito: um
   * 403 distinguível de um 404 confirmaria que aquele id existe, e a agenda
   * particular de alguém não deve ser descobrível nem por tentativa.
   */
  async buscar(id: string, quem: Espectador): Promise<Compromisso> {
    const c = await this.repo.buscarVisivel(id, quem);
    if (!c) throw new NotFoundError('Compromisso não encontrado.');
    return c;
  }

  async criar(input: CriarCompromissoDTO): Promise<Compromisso> {
    const dados = normalizarEValidarCompromisso(input);
    await this.conferirVinculos(dados);
    return this.repo.criar(dados);
  }

  /**
   * Autoriza a escrita e grava.
   *
   * Ser convidado dá direito de **ver**, não de mexer — a reunião é de quem a
   * marcou. Fora criador e responsável, só quem administra a agenda do órgão
   * (faixa Total do recurso `AGENDA`), e mesmo esse não alcança um particular.
   */
  private async exigirPermissaoDeEscrita(id: string, quem: Espectador, administra: boolean) {
    const alvo = await this.repo.buscarParaAutorizacao(id);
    if (!alvo) throw new NotFoundError('Compromisso não encontrado.');

    // Quem nem enxerga não pode nem saber que existe: mesma resposta do buscar.
    const { podeVer } = await import('@/core/compromisso/visibilidade');
    if (!podeVer(alvo, quem)) throw new NotFoundError('Compromisso não encontrado.');

    if (!podeAlterar(alvo, quem, administra))
      throw new AppError(
        'Você participa deste compromisso, mas quem pode alterá-lo é quem o criou ou o responsável.',
        403,
        'SEM_PERMISSAO',
      );
    return alvo;
  }

  async atualizar(
    id: string,
    input: AtualizarCompromissoDTO,
    quem: Espectador,
    administra: boolean,
  ): Promise<Compromisso> {
    await this.exigirPermissaoDeEscrita(id, quem, administra);
    const dados = normalizarEValidarCompromisso(input);
    await this.conferirVinculos(dados);
    return this.repo.atualizar(id, dados);
  }

  /**
   * Muda só a situação — o clique de "realizado" ou "cancelado" na agenda.
   *
   * Voltar de REALIZADO para AGENDADO **apaga o registro**: uma ata de reunião
   * que o sistema voltou a considerar não realizada seria documento sem evento.
   */
  async definirStatus(
    id: string,
    status: string,
    quem: Espectador,
    administra: boolean,
  ): Promise<Compromisso> {
    await this.exigirPermissaoDeEscrita(id, quem, administra);
    if (!STATUS.includes(status as StatusCompromisso)) throw new BusinessError('Situação inválida.');
    const novo = status as StatusCompromisso;
    const atual = await this.buscar(id, quem);

    return this.repo.atualizar(id, {
      tipo: atual.tipo,
      titulo: atual.titulo,
      pauta: atual.pauta,
      inicioEm: new Date(atual.inicioEm),
      fimEm: new Date(atual.fimEm),
      diaInteiro: atual.diaInteiro,
      local: atual.local,
      cor: atual.cor,
      visibilidade: atual.visibilidade,
      recorrencia: atual.recorrencia,
      recorrenciaIntervalo: atual.recorrenciaIntervalo,
      recorrenciaAte: atual.recorrenciaAte ? new Date(atual.recorrenciaAte) : null,
      ajusteId: atual.ajusteId,
      responsavelId: atual.responsavelId,
      status: novo,
      registro: novo === 'REALIZADO' ? atual.registro : null,
      participantes: atual.participantes.map((p) => p.id),
      grupos: atual.grupos.map((g) => g.id),
      alertas: atual.alertas.map((a) => ({ minutosAntes: a.minutosAntes, canal: a.canal })),
    });
  }

  /**
   * Excluir só o que não deixou rastro.
   *
   * Compromisso que gerou providências é a origem delas: apagá-lo deixaria as
   * tarefas apontando para o nada. Para tirar da agenda sem perder o histórico,
   * o caminho é **Cancelado**.
   */
  async excluir(id: string, quem: Espectador, administra: boolean): Promise<void> {
    await this.exigirPermissaoDeEscrita(id, quem, administra);
    const tarefas = await this.repo.contarTarefas(id);
    if (tarefas > 0)
      throw new BusinessError(
        `Este compromisso originou ${tarefas} tarefa(s) e não pode ser excluído. ` +
          'Use a situação Cancelado para tirá-lo da agenda sem perder o histórico.',
      );
    await this.repo.excluir(id);
  }

  /**
   * Compromissos de uma janela de datas.
   *
   * A janela é **obrigatória** e limitada: agenda se abre num mês, não no
   * histórico inteiro. Sem esse teto, abrir a tela com anos de compromissos
   * carregaria tudo — e a recorrência, que é expandida na leitura, tornaria o
   * custo pior ainda.
   */
  async listar(params: {
    filtros?: Record<string, unknown>;
    quem: Espectador;
  }): Promise<Compromisso[]> {
    const e = params.filtros ?? {};

    const data = (v: unknown): Date | undefined => {
      const d = new Date(String(v ?? ''));
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const de = data(e.de);
    const ate = data(e.ate);
    if (!de || !ate) throw new BusinessError('Informe o período (de e até) da agenda.');
    if (ate < de) throw new BusinessError('O fim do período é anterior ao início.');

    const dias = (ate.getTime() - de.getTime()) / 86_400_000;
    if (dias > JANELA_MAX_DIAS)
      throw new BusinessError(`Período longo demais (máx. ${JANELA_MAX_DIAS} dias).`);

    const filtros: FiltrosCompromisso = { de, ate };
    const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    filtros.tipo = texto(e.tipo) as never;
    filtros.status = STATUS.includes(String(e.status) as StatusCompromisso)
      ? (String(e.status) as StatusCompromisso)
      : undefined;
    filtros.ajusteId = texto(e.ajusteId);
    filtros.responsavelId = texto(e.responsavelId);
    filtros.participanteId = texto(e.participanteId);
    filtros.grupoId = texto(e.grupoId);
    filtros.busca = texto(e.busca);
    if (e.pendentesDeRegistro === true) filtros.pendentesDeRegistro = true;

    return this.repo.listar({ filtros, espectador: params.quem, limite: LIMITE_JANELA });
  }

  resumo(quem: Espectador, agora = new Date()): Promise<ResumoAgenda> {
    return this.repo.resumo(quem, agora);
  }
}

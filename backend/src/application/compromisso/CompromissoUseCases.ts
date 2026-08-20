import type { Compromisso, ResumoAgenda, StatusCompromisso } from '@/core/compromisso/Compromisso';
import { STATUS, podeArrastar } from '@/core/compromisso/Compromisso';
import { podeAlterar, type Espectador } from '@/core/compromisso/visibilidade';
import { AppError, BusinessError, NotFoundError } from '@/shared/errors';
import type { ICompromissoRepository } from './ICompromissoRepository';
import type {
  AtualizarCompromissoDTO,
  CriarCompromissoDTO,
  DadosCompromisso,
  FiltrosCompromisso,
} from './dtos';
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
   * O compromisso de volta ao formato de gravação.
   *
   * As alterações pontuais — mudar a situação, arrastar o horário — precisam
   * reescrever o registro inteiro, porque `atualizar` substitui os vínculos por
   * inteiro. Reconstruir isso em cada uma delas seria três lugares para
   * esquecer um campo novo do compromisso.
   */
  private paraGravacao(atual: Compromisso): DadosCompromisso {
    return {
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
      status: atual.status,
      registro: atual.registro,
      participantes: atual.participantes.map((p) => p.id),
      grupos: atual.grupos.map((g) => g.id),
      alertas: atual.alertas.map((a) => ({ minutosAntes: a.minutosAntes })),
    };
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
      ...this.paraGravacao(atual),
      status: novo,
      registro: novo === 'REALIZADO' ? atual.registro : null,
    });
  }

  /**
   * Remarcar arrastando na grade — muda **só** o horário.
   *
   * Existe separado do `atualizar` porque o gesto é outro: arrastar não é
   * preencher um formulário. A tela não tem por que devolver título, pauta e
   * lista de convidados para mover uma reunião meia hora, e um PUT parcial
   * apagaria em silêncio o que não fosse reenviado.
   *
   * Três recusas, e cada uma evita um estrago diferente:
   *
   * - **Série recorrente, não.** A grade mostra as repetições expandidas, que
   *   não existem como linha: arrastar uma delas moveria a série inteira, e as
   *   outras ocorrências saltariam junto sem que ninguém tenha pedido. Quem
   *   quiser mover a série usa o formulário, onde isso está escrito.
   * - **Realizado, não.** Já aconteceu, e o registro descreve o que foi tratado
   *   naquele encontro. Mudar a hora depois reescreveria o histórico.
   * - **Cancelado, não.** O compromisso não vai ocorrer; remarcá-lo é agendar
   *   outro, não mover este.
   *
   * Um arrasto é um gesto que se dispara sem querer — daí recusar em vez de
   * avisar. Perder a hora de uma reunião por um clique torto é caro.
   */
  async mover(
    id: string,
    input: { inicioEm?: unknown; fimEm?: unknown },
    quem: Espectador,
    administra: boolean,
  ): Promise<Compromisso> {
    await this.exigirPermissaoDeEscrita(id, quem, administra);
    const atual = await this.buscar(id, quem);

    // A decisão é a mesma que a tela usa para deixar (ou não) o bloco se mover;
    // aqui só se escolhe a mensagem que explica a recusa.
    if (!podeArrastar(atual)) {
      if (atual.recorrencia !== 'NAO_REPETE')
        throw new BusinessError(
          'Este compromisso se repete e não pode ser remarcado arrastando — ' +
            'mover uma ocorrência mudaria a série inteira. Abra o compromisso para alterar a série.',
        );
      throw new BusinessError(
        atual.status === 'REALIZADO'
          ? 'Compromisso já realizado não é remarcado: o registro descreve o que foi tratado naquele horário.'
          : 'Compromisso cancelado não é remarcado. Agende um novo.',
      );
    }

    const inicioEm = new Date(String(input.inicioEm ?? ''));
    if (Number.isNaN(inicioEm.getTime())) throw new BusinessError('Novo início inválido.');

    // Dia inteiro não tem hora para arrastar: só muda de dia, e o fim é sempre
    // o fecho daquele dia — quem recalcula isso é o validador, um lugar só.
    const fimEm = atual.diaInteiro ? null : new Date(String(input.fimEm ?? ''));
    if (fimEm && Number.isNaN(fimEm.getTime())) throw new BusinessError('Novo término inválido.');

    const base = this.paraGravacao(atual);
    const dados = normalizarEValidarCompromisso({
      ...base,
      inicioEm: inicioEm.toISOString(),
      fimEm: fimEm ? fimEm.toISOString() : null,
      recorrenciaAte: null,
    });

    return this.repo.atualizar(id, dados);
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

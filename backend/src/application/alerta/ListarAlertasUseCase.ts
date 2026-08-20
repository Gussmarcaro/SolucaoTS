import type { Alerta, UrgenciaAlerta } from '@/core/alerta/Alerta';
import { ALERTAS_SILENCIAVEIS } from '@/core/tarefa/Tarefa';
import { diasAte, somarDiasUteis } from '@/shared/diasUteis';
import { parseDataISO } from '@/shared/datas';

/** Alerta antes de saber se há tarefa — a ligação é feita no fim. */
type AlertaBase = Omit<Alerta, 'tarefa'>;

/** Linhas cruas que o repositório entrega; as regras ficam aqui. */
export interface DadosAlertas {
  prestacoesRejeitadas: { id: string; ajusteCodigo: string; entidadeNome: string; ano: number }[];
  /** Certidões da entidade e do ajuste, já unificadas em uma forma só. */
  certidoes: { id: string; descricao: string; vencimento: string; onde: string }[];
  ajustesRecentes: { id: string; codigoAjuste: string; entidadeNome: string; dataAssinatura: string }[];
  aditivosRecentes: { id: string; numero: string; ajusteId: string; ajusteCodigo: string; dataAssinatura: string }[];
  orgaos: { id: string; nome: string; periodicidade: 'QUADRIMESTRAL' | 'ANUAL' }[];
  /** Ajustes do exercício ainda sem prestação Armazenada. */
  ajustesSemPrestacao: number;
  /** Tarefas de acompanhamento nascidas de um alerta (as não canceladas). */
  tarefasDeAlerta: { id: string; origemAlerta: string; status: string }[];
  /**
   * Lembretes de compromisso já **maduros** — o repositório só entrega os que
   * chegaram a hora de avisar, e só os que o usuário enxerga. A regra de
   * visibilidade da agenda vale aqui igual: o sino não pode ser a porta dos
   * fundos para a agenda particular de um colega.
   */
  lembretes: {
    compromissoId: string;
    titulo: string;
    inicioEm: string;
    local: string | null;
    minutosAntes: number;
  }[];
}

export interface IAlertaRepository {
  coletar(desde: string, espectador: { usuarioId: string; grupoId: string | null }): Promise<DadosAlertas>;
}

/** Prazo do TCESP para cadastrar Ajuste e Termo Aditivo (§5 das regras). */
const DIAS_UTEIS_CADASTRO = 10;
/** Declaração Negativa: 5 dias úteis (quadrimestral) ou 15 (anual). */
const DIAS_UTEIS_NEGATIVA = { QUADRIMESTRAL: 5, ANUAL: 15 } as const;

/** Só entram na lista prazos dentro desta janela — antes disso é ruído. */
const JANELA_FUTURA = 30;
/** Vencido há mais que isto deixa de ser alerta e vira pendência antiga. */
const JANELA_PASSADA = 60;

function urgencia(dias: number): UrgenciaAlerta {
  if (dias < 0) return 'VENCIDO';
  return dias <= 7 ? 'CRITICO' : 'PROXIMO';
}

const PESO: Record<UrgenciaAlerta, number> = { VENCIDO: 0, CRITICO: 1, PROXIMO: 2 };

/** Fim do último período encerrado e o do próximo a encerrar. */
function fimDosQuadrimestres(hoje: Date): Date[] {
  const ano = hoje.getUTCFullYear();
  return [
    new Date(Date.UTC(ano - 1, 11, 31)),
    new Date(Date.UTC(ano, 3, 30)),
    new Date(Date.UTC(ano, 7, 31)),
    new Date(Date.UTC(ano, 11, 31)),
  ];
}

/**
 * Alertas de prazo e de pendência, calculados a cada consulta.
 *
 * Nada disso é gravado. Uma notificação gravada nasce desatualizada — a
 * certidão é renovada e o aviso continua lá, a prestação é corrigida e o
 * alerta persiste. Calculando na hora, o sino não mente, e não há processo de
 * geração para manter no ar.
 *
 * Em compensação, tudo aqui precisa ser barato: são consultas por índice e
 * aritmética de data, sem varrer histórico.
 */
export class ListarAlertasUseCase {
  constructor(private readonly repo: IAlertaRepository) {}

  async execute(
    espectador: { usuarioId: string; grupoId: string | null },
    hoje = new Date(),
  ): Promise<Alerta[]> {
    const desde = new Date(hoje.getTime());
    desde.setUTCDate(desde.getUTCDate() - JANELA_PASSADA);
    const dados = await this.repo.coletar(desde.toISOString().slice(0, 10), espectador);

    const base: AlertaBase[] = [
      ...this.rejeitadas(dados),
      ...this.certidoes(dados, hoje),
      ...this.cadastros(dados, hoje),
      ...this.declaracoesNegativas(dados, hoje),
      ...this.prestacaoDeContas(dados, hoje),
      ...this.lembretes(dados, hoje),
    ];

    const alertas = this.comTarefas(base, dados);

    // Vencido primeiro; dentro do mesmo grupo, o prazo mais apertado na frente.
    return alertas.sort(
      (a, b) => PESO[a.urgencia] - PESO[b.urgencia] || (a.dias ?? 0) - (b.dias ?? 0),
    );
  }

  /**
   * Liga cada alerta à sua tarefa de acompanhamento — e some com o que já foi
   * resolvido, mas só onde isso é honesto.
   *
   * Um alerta é silenciado por tarefa concluída **apenas** quando o ato é
   * praticado fora daqui e o sistema não tem como conferir sozinho: cadastro de
   * ajuste e de aditivo no Audesp, Declaração Negativa (`ALERTAS_SILENCIAVEIS`).
   * Nesses, a tarefa concluída é a única prova disponível, e continuar cobrando
   * seria ignorar o registro do próprio usuário.
   *
   * Nos demais — certidão, prestação rejeitada, prestação do exercício — o
   * alerta **permanece**, por mais concluída que esteja a tarefa. Concluir não
   * renova certidão nem muda o status no Tribunal; deixar a tarefa apagar o
   * aviso faria o sistema desmentir os próprios dados, que é exatamente o que o
   * sino existe para não fazer. Ali a tarefa aparece ligada, e nada mais.
   */
  private comTarefas(base: AlertaBase[], d: DadosAlertas): Alerta[] {
    const porOrigem = new Map(d.tarefasDeAlerta.map((t) => [t.origemAlerta, t]));

    return base.flatMap((a): Alerta[] => {
      const t = porOrigem.get(a.id);
      if (t?.status === 'CONCLUIDA' && ALERTAS_SILENCIAVEIS.has(a.tipo)) return [];
      return [{ ...a, tarefa: t ? { id: t.id, status: t.status } : null }];
    });
  }

  /** Rejeição não tem prazo — tem urgência. Sempre no topo. */
  private rejeitadas(d: DadosAlertas): AlertaBase[] {
    return d.prestacoesRejeitadas.map((p) => ({
      id: `prestacao-rejeitada:${p.id}`,
      tipo: 'PRESTACAO_REJEITADA' as const,
      urgencia: 'VENCIDO' as const,
      titulo: `Prestação rejeitada pelo TCESP — ${p.ajusteCodigo}`,
      detalhe: `Exercício ${p.ano} · ${p.entidadeNome}. Corrija as inconformidades e retransmita.`,
      dias: null,
      referenciaId: p.id,
    }));
  }

  private certidoes(d: DadosAlertas, hoje: Date): AlertaBase[] {
    return d.certidoes.flatMap((c) => {
      const dias = diasAte(parseDataISO(c.vencimento), hoje);
      if (dias > JANELA_FUTURA || dias < -JANELA_PASSADA) return [];
      return [
        {
          id: `certidao:${c.id}`,
          tipo: 'CERTIDAO' as const,
          urgencia: urgencia(dias),
          titulo: dias < 0 ? `Certidão vencida — ${c.descricao}` : `Certidão a vencer — ${c.descricao}`,
          detalhe: `${c.onde} · vencimento em ${c.vencimento}. Certidão vencida impede o repasse.`,
          dias,
          referenciaId: c.id,
        },
      ];
    });
  }

  /**
   * Prazo para cadastrar Ajuste e Termo Aditivo no Audesp.
   *
   * O cadastro é feito na tela do TCESP, fora deste sistema — então aqui não
   * há como saber se já foi enviado. O alerta é um lembrete a partir da data de
   * assinatura, não uma afirmação sobre o que existe no Tribunal, e o texto
   * precisa deixar isso claro.
   */
  private cadastros(d: DadosAlertas, hoje: Date): AlertaBase[] {
    const doPrazo = (assinatura: string) =>
      diasAte(somarDiasUteis(parseDataISO(assinatura), DIAS_UTEIS_CADASTRO), hoje);

    const ajustes = d.ajustesRecentes.flatMap((a): AlertaBase[] => {
      const dias = doPrazo(a.dataAssinatura);
      if (dias > JANELA_FUTURA || dias < -JANELA_PASSADA) return [];
      return [
        {
          id: `cadastro-ajuste:${a.id}`,
          tipo: 'CADASTRO_AJUSTE',
          urgencia: urgencia(dias),
          titulo: `Cadastro do ajuste ${a.codigoAjuste} no Audesp`,
          detalhe: `${a.entidadeNome} · assinado em ${a.dataAssinatura}. Prazo de ${DIAS_UTEIS_CADASTRO} dias úteis.`,
          dias,
          referenciaId: a.id,
        },
      ];
    });

    const aditivos = d.aditivosRecentes.flatMap((t): AlertaBase[] => {
      const dias = doPrazo(t.dataAssinatura);
      if (dias > JANELA_FUTURA || dias < -JANELA_PASSADA) return [];
      return [
        {
          id: `cadastro-aditivo:${t.id}`,
          tipo: 'CADASTRO_ADITIVO',
          urgencia: urgencia(dias),
          titulo: `Cadastro do termo aditivo ${t.numero} no Audesp`,
          detalhe: `Ajuste ${t.ajusteCodigo} · assinado em ${t.dataAssinatura}. Prazo de ${DIAS_UTEIS_CADASTRO} dias úteis.`,
          dias,
          referenciaId: t.ajusteId,
        },
      ];
    });

    return [...ajustes, ...aditivos];
  }

  /**
   * Declaração Negativa — a periodicidade do órgão define o prazo (§5).
   *
   * Quadrimestral: 5 dias úteis após o quadrimestre. Anual: 15 dias úteis após
   * o exercício. Só interessa o período encerrado mais recente: o anterior já
   * passou da janela e o seguinte ainda não começou a contar.
   */
  private declaracoesNegativas(d: DadosAlertas, hoje: Date): AlertaBase[] {
    return d.orgaos.flatMap((o): AlertaBase[] => {
      const fins =
        o.periodicidade === 'QUADRIMESTRAL'
          ? fimDosQuadrimestres(hoje)
          : [new Date(Date.UTC(hoje.getUTCFullYear() - 1, 11, 31))];

      const encerrados = fins.filter((f) => f.getTime() <= hoje.getTime());
      const ultimo = encerrados[encerrados.length - 1];
      if (!ultimo) return [];

      const dias = diasAte(somarDiasUteis(ultimo, DIAS_UTEIS_NEGATIVA[o.periodicidade]), hoje);
      if (dias > JANELA_FUTURA || dias < -JANELA_PASSADA) return [];

      const periodo = ultimo.toISOString().slice(0, 10);
      return [
        {
          id: `declaracao-negativa:${o.id}:${periodo}`,
          tipo: 'DECLARACAO_NEGATIVA',
          urgencia: urgencia(dias),
          titulo: `Declaração Negativa — ${o.nome}`,
          detalhe: `Período encerrado em ${periodo} · periodicidade ${o.periodicidade === 'QUADRIMESTRAL' ? 'quadrimestral' : 'anual'}. Devida quando não houve repasse no período.`,
          dias,
          referenciaId: o.id,
        },
      ];
    });
  }

  /**
   * Lembretes de compromisso da agenda.
   *
   * Diferente dos demais alertas, este é medido em **minutos**, não em dias — a
   * reunião é daqui a pouco, não daqui a uma semana. Por isso `dias` vai nulo e
   * a urgência é sempre crítica: o aviso só aparece quando já é hora de avisar.
   */
  private lembretes(d: DadosAlertas, hoje: Date): AlertaBase[] {
    return (d.lembretes ?? []).map((l) => {
      const faltam = Math.round((new Date(l.inicioEm).getTime() - hoje.getTime()) / 60000);
      const quando =
        faltam <= 0 ? 'agora' : faltam < 60 ? `em ${faltam} min` : `em ${Math.round(faltam / 60)}h`;
      return {
        id: `compromisso:${l.compromissoId}:${l.minutosAntes}`,
        tipo: 'COMPROMISSO' as const,
        urgencia: 'CRITICO' as const,
        titulo: l.titulo,
        detalhe: `Começa ${quando}${l.local ? ` · ${l.local}` : ''}.`,
        dias: null,
        referenciaId: l.compromissoId,
      };
    });
  }

  /** Prestação anual e consolidada: até 30/06 do exercício seguinte. */
  private prestacaoDeContas(d: DadosAlertas, hoje: Date): AlertaBase[] {
    if (d.ajustesSemPrestacao === 0) return [];

    const exercicio = hoje.getUTCMonth() >= 6 ? hoje.getUTCFullYear() : hoje.getUTCFullYear() - 1;
    const prazo = new Date(Date.UTC(exercicio + 1, 5, 30));
    const dias = diasAte(prazo, hoje);
    if (dias > 60) return [];

    return [
      {
        id: `prestacao-contas:${exercicio}`,
        tipo: 'PRESTACAO_CONTAS',
        urgencia: urgencia(dias),
        titulo: `Prestação de contas do exercício ${exercicio}`,
        detalhe: `${d.ajustesSemPrestacao} ajuste(s) sem prestação armazenada. Entrega até 30/06/${exercicio + 1}.`,
        dias,
        referenciaId: null,
      },
    ];
  }
}

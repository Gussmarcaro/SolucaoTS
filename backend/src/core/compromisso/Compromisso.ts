/**
 * Compromisso da agenda — um **evento**, não uma providência.
 *
 * `Tarefa` tem data-limite e atrasa; `Compromisso` tem momento e acontece. Uma
 * reunião não fica "atrasada há 3 dias": ela ocorreu, foi cancelada, ou ainda
 * vai acontecer. O que sobra dela é o registro do que foi tratado — e as
 * providências, que viram tarefas ligadas a ela.
 */

export type TipoCompromisso =
  | 'REUNIAO_MONITORAMENTO'
  | 'VISITA_IN_LOCO'
  | 'COMISSAO_AVALIACAO'
  | 'AUDIENCIA_PUBLICA'
  | 'TCESP'
  | 'OUTRO';

export type StatusCompromisso = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';
export type Recorrencia = 'NAO_REPETE' | 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';

export const TIPOS: TipoCompromisso[] = [
  'REUNIAO_MONITORAMENTO',
  'VISITA_IN_LOCO',
  'COMISSAO_AVALIACAO',
  'AUDIENCIA_PUBLICA',
  'TCESP',
  'OUTRO',
];

export const STATUS: StatusCompromisso[] = ['AGENDADO', 'REALIZADO', 'CANCELADO'];
export const RECORRENCIAS: Recorrencia[] = ['NAO_REPETE', 'DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL'];

export interface AlertaCompromisso {
  id: string;
  /** Antecedência em minutos. O aviso aparece no sino, calculado na consulta. */
  minutosAntes: number;
}

export interface Compromisso {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  /** ISO completo. Numa ocorrência expandida, é a data **daquela** repetição. */
  inicioEm: string;
  fimEm: string;
  diaInteiro: boolean;
  local: string | null;
  cor: string | null;
  visibilidade: 'PARTICULAR' | 'RESTRITO' | 'ORGAO';
  recorrencia: Recorrencia;
  recorrenciaIntervalo: number | null;
  recorrenciaAte: string | null;
  status: StatusCompromisso;
  registro: string | null;
  ajusteId: string | null;
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  participantes: { id: string; nome: string }[];
  grupos: { id: string; nome: string }[];
  alertas: AlertaCompromisso[];
  tarefas: number;
  criadoPor: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  /**
   * Verdadeiro quando a linha é uma **repetição expandida**, não a original.
   * A interface usa para saber que editar ali mexe na série inteira.
   */
  ocorrencia?: boolean;
}

export interface ResumoAgenda {
  proximos: number;
  hoje: number;
  pendentesDeRegistro: number;
  realizados: number;
}

/**
 * Compromisso passado que ninguém fechou.
 *
 * Não é "atrasado" — o evento já aconteceu ou não. Mas ficar `AGENDADO` depois
 * da hora significa que ninguém registrou o que houve, e sem registro a reunião
 * não deixou rastro nenhum.
 */
export function pendenteDeRegistro(
  c: { status: StatusCompromisso; inicioEm: string },
  agora = new Date(),
): boolean {
  return c.status === 'AGENDADO' && new Date(c.inicioEm).getTime() < agora.getTime();
}

/** Teto de repetições por consulta — ver `expandirRecorrencia`. */
export const MAX_OCORRENCIAS = 400;

/**
 * Expande uma regra de recorrência nas ocorrências que caem numa janela.
 *
 * A recorrência é guardada como **regra**, não materializada em linhas. Duas
 * razões: a tabela não cresce com o tempo (um compromisso "toda semana, sem
 * fim" seria infinitas linhas), e editar a série passa a ser editar **uma**
 * linha em vez de varrer centenas de cópias.
 *
 * O preço é este cálculo na leitura — barato porque a janela é sempre um mês,
 * no máximo, e limitado por `MAX_OCORRENCIAS` para que uma regra absurda não
 * vire laço longo.
 */
export function expandirRecorrencia(
  base: { inicioEm: Date; fimEm: Date; recorrencia: Recorrencia; recorrenciaIntervalo: number | null; recorrenciaAte: Date | null },
  janela: { de: Date; ate: Date },
): { inicioEm: Date; fimEm: Date }[] {
  const duracao = base.fimEm.getTime() - base.inicioEm.getTime();
  const passo = Math.max(1, base.recorrenciaIntervalo ?? 1);

  if (base.recorrencia === 'NAO_REPETE') {
    const dentro = base.inicioEm <= janela.ate && base.fimEm >= janela.de;
    return dentro ? [{ inicioEm: base.inicioEm, fimEm: base.fimEm }] : [];
  }

  const limite = base.recorrenciaAte && base.recorrenciaAte < janela.ate ? base.recorrenciaAte : janela.ate;
  const saida: { inicioEm: Date; fimEm: Date }[] = [];

  // Avança a partir da data original. Começar do início da janela exigiria
  // aritmética de calendário para "cair no dia certo" nas regras mensal e
  // anual — e é aí que meses de 31 dias e fevereiro estragam a conta.
  const cursor = new Date(base.inicioEm);
  for (let i = 0; i < MAX_OCORRENCIAS && cursor <= limite; i += 1) {
    if (cursor >= janela.de) {
      saida.push({ inicioEm: new Date(cursor), fimEm: new Date(cursor.getTime() + duracao) });
    }
    switch (base.recorrencia) {
      case 'DIARIA':
        cursor.setDate(cursor.getDate() + passo);
        break;
      case 'SEMANAL':
        cursor.setDate(cursor.getDate() + 7 * passo);
        break;
      case 'MENSAL':
        cursor.setMonth(cursor.getMonth() + passo);
        break;
      case 'ANUAL':
        cursor.setFullYear(cursor.getFullYear() + passo);
        break;
    }
  }
  return saida;
}

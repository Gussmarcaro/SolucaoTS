/**
 * Compromisso da agenda — um **evento**, não uma providência.
 *
 * `Tarefa` tem data-limite e atrasa; `Compromisso` tem momento e acontece. Uma
 * reunião de monitoramento não fica "atrasada há 3 dias": ela ocorreu, foi
 * cancelada, ou ainda vai acontecer. O que sobra dela é o registro do que foi
 * tratado — e as providências, que viram tarefas ligadas a ela.
 */

export type TipoCompromisso =
  | 'REUNIAO_MONITORAMENTO'
  | 'VISITA_IN_LOCO'
  | 'COMISSAO_AVALIACAO'
  | 'AUDIENCIA_PUBLICA'
  | 'TCESP'
  | 'OUTRO';

export type StatusCompromisso = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';

export const TIPOS: TipoCompromisso[] = [
  'REUNIAO_MONITORAMENTO',
  'VISITA_IN_LOCO',
  'COMISSAO_AVALIACAO',
  'AUDIENCIA_PUBLICA',
  'TCESP',
  'OUTRO',
];

export const STATUS: StatusCompromisso[] = ['AGENDADO', 'REALIZADO', 'CANCELADO'];

export interface Compromisso {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  /** ISO completo, com hora — é o que separa isto de um prazo. */
  inicioEm: string;
  duracaoMinutos: number | null;
  local: string | null;
  participantes: string | null;
  status: StatusCompromisso;
  registro: string | null;
  ajusteId: string | null;
  /** Denormalizados para a agenda não fazer uma consulta por linha. */
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  /** Quantas providências nasceram deste compromisso. */
  tarefas: number;
  criadoPor: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Compromisso passado que ninguém fechou.
 *
 * Não é "atrasado" — o evento já aconteceu ou não. Mas ficar `AGENDADO` depois
 * da hora significa que ninguém registrou o que houve, e é isso que a agenda
 * precisa cobrar: sem o registro, a reunião não deixou rastro nenhum.
 */
export function pendenteDeRegistro(c: {
  status: StatusCompromisso;
  inicioEm: string;
}, agora = new Date()): boolean {
  return c.status === 'AGENDADO' && new Date(c.inicioEm).getTime() < agora.getTime();
}

/** Contagens do cabeçalho da agenda. */
export interface ResumoAgenda {
  proximos: number;
  hoje: number;
  pendentesDeRegistro: number;
  realizados: number;
}

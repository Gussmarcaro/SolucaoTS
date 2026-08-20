export type TipoCompromisso =
  | 'REUNIAO_MONITORAMENTO'
  | 'VISITA_IN_LOCO'
  | 'COMISSAO_AVALIACAO'
  | 'AUDIENCIA_PUBLICA'
  | 'TCESP'
  | 'OUTRO';

export type StatusCompromisso = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';

export interface Compromisso {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  /** ISO completo, com hora. */
  inicioEm: string;
  duracaoMinutos: number | null;
  local: string | null;
  participantes: string | null;
  status: StatusCompromisso;
  registro: string | null;
  ajusteId: string | null;
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  /** Quantas providências nasceram deste compromisso. */
  tarefas: number;
  criadoPor: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CompromissoPayload {
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  inicioEm: string;
  duracaoMinutos: number | null;
  local: string | null;
  participantes: string | null;
  ajusteId: string | null;
  responsavelId: string | null;
  status: StatusCompromisso;
  registro: string | null;
}

export interface ResumoAgenda {
  proximos: number;
  hoje: number;
  pendentesDeRegistro: number;
  realizados: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const TIPO_LABEL: Record<TipoCompromisso, string> = {
  REUNIAO_MONITORAMENTO: 'Reunião de monitoramento',
  VISITA_IN_LOCO: 'Visita in loco',
  COMISSAO_AVALIACAO: 'Comissão de Monitoramento e Avaliação',
  AUDIENCIA_PUBLICA: 'Audiência pública',
  TCESP: 'TCESP',
  OUTRO: 'Outro',
};

/** Cor da bolinha no calendário — um tipo, uma cor. */
export const TIPO_COR: Record<TipoCompromisso, string> = {
  REUNIAO_MONITORAMENTO: 'bg-brand-500',
  VISITA_IN_LOCO: 'bg-emerald-500',
  COMISSAO_AVALIACAO: 'bg-violet-500',
  AUDIENCIA_PUBLICA: 'bg-amber-500',
  TCESP: 'bg-red-500',
  OUTRO: 'bg-ink-400',
};

export const STATUS_LABEL: Record<StatusCompromisso, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
};

export const STATUS_TONE: Record<StatusCompromisso, 'brand' | 'success' | 'neutral'> = {
  AGENDADO: 'brand',
  REALIZADO: 'success',
  CANCELADO: 'neutral',
};

/**
 * Compromisso passado que ninguém fechou — espelha a regra do backend.
 *
 * Não é "atrasado": o evento já aconteceu ou não. Mas continuar AGENDADO
 * depois da hora significa que ninguém registrou o que houve, e sem registro
 * a reunião não deixou rastro nenhum.
 */
export function pendenteDeRegistro(c: Compromisso, agora = new Date()): boolean {
  return c.status === 'AGENDADO' && new Date(c.inicioEm).getTime() < agora.getTime();
}

/** 'YYYY-MM-DDTHH:mm' — o formato que o input datetime-local usa. */
export function paraInputDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function horaBr(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

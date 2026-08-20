import type { StatusCompromisso, TipoCompromisso } from '@/core/compromisso/Compromisso';

export interface CriarCompromissoDTO {
  tipo: string;
  titulo: string;
  pauta?: string | null;
  /** ISO com hora, ex.: '2026-09-12T14:00'. */
  inicioEm: string;
  duracaoMinutos?: number | string | null;
  local?: string | null;
  participantes?: string | null;
  ajusteId?: string | null;
  responsavelId?: string | null;
  status?: string | null;
  registro?: string | null;
}

export type AtualizarCompromissoDTO = CriarCompromissoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosCompromisso {
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  inicioEm: Date;
  duracaoMinutos: number | null;
  local: string | null;
  participantes: string | null;
  ajusteId: string | null;
  responsavelId: string | null;
  status: StatusCompromisso;
  registro: string | null;
}

export interface FiltrosCompromisso {
  tipo?: TipoCompromisso;
  status?: StatusCompromisso;
  ajusteId?: string;
  responsavelId?: string;
  /** Janela de datas — é como a agenda consulta. */
  de?: Date;
  ate?: Date;
  /** Só os que já passaram e continuam AGENDADO. */
  pendentesDeRegistro?: boolean;
}

export interface ListarCompromissosParams {
  filtros: FiltrosCompromisso;
  busca?: string;
  page: number;
  pageSize: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

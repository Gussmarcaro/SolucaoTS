import type {
  CanalAlerta,
  Recorrencia,
  StatusCompromisso,
  TipoCompromisso,
} from '@/core/compromisso/Compromisso';
import type { VisibilidadeCompromisso } from '@/core/compromisso/visibilidade';

export interface AlertaDTO {
  minutosAntes: number | string;
  canal?: string | null;
}

export interface CriarCompromissoDTO {
  tipo?: string | null;
  titulo: string;
  pauta?: string | null;
  /** ISO com hora, ex.: '2026-09-12T14:00'. */
  inicioEm: string;
  fimEm?: string | null;
  diaInteiro?: boolean;
  local?: string | null;
  cor?: string | null;
  visibilidade?: string | null;
  recorrencia?: string | null;
  recorrenciaIntervalo?: number | string | null;
  recorrenciaAte?: string | null;
  ajusteId?: string | null;
  responsavelId?: string | null;
  status?: string | null;
  registro?: string | null;
  /** Ids de usuários convidados. */
  participantes?: string[];
  /** Ids de grupos convidados. */
  grupos?: string[];
  alertas?: AlertaDTO[];
}

export type AtualizarCompromissoDTO = CriarCompromissoDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosCompromisso {
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  inicioEm: Date;
  fimEm: Date;
  diaInteiro: boolean;
  local: string | null;
  cor: string | null;
  visibilidade: VisibilidadeCompromisso;
  recorrencia: Recorrencia;
  recorrenciaIntervalo: number | null;
  recorrenciaAte: Date | null;
  ajusteId: string | null;
  responsavelId: string | null;
  status: StatusCompromisso;
  registro: string | null;
  participantes: string[];
  grupos: string[];
  alertas: { minutosAntes: number; canal: CanalAlerta }[];
}

export interface FiltrosCompromisso {
  tipo?: TipoCompromisso;
  status?: StatusCompromisso;
  ajusteId?: string;
  responsavelId?: string;
  /** Só compromissos que incluem este usuário como participante. */
  participanteId?: string;
  grupoId?: string;
  /** Janela obrigatória na agenda — ver `ListarCompromissosParams`. */
  de?: Date;
  ate?: Date;
  pendentesDeRegistro?: boolean;
  busca?: string;
}

export interface ListarCompromissosParams {
  filtros: FiltrosCompromisso;
  /** Quem está consultando — define o que a consulta pode devolver. */
  espectador: { usuarioId: string; grupoId: string | null };
  limite: number;
}

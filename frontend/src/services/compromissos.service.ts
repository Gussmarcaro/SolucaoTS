import { http } from './http';
import type {
  Compromisso,
  CompromissoPayload,
  ResumoAgenda,
  StatusCompromisso,
} from '@/types/compromisso';

export interface FiltrosCompromisso {
  /** Obrigatórios: a agenda pede uma janela, não o histórico inteiro. */
  de: string;
  ate: string;
  tipo?: string;
  status?: string;
  ajusteId?: string;
  responsavelId?: string;
  participanteId?: string;
  grupoId?: string;
  busca?: string;
  pendentesDeRegistro?: boolean;
}

/**
 * Compromissos de um período.
 *
 * A janela é sempre enviada — é o que impede a tela de carregar anos de agenda
 * ao abrir, e o que torna a expansão da recorrência barata no servidor.
 */
export async function listarCompromissos(f: FiltrosCompromisso): Promise<Compromisso[]> {
  const { data } = await http.get<Compromisso[]>('/compromissos', {
    params: {
      ...f,
      busca: f.busca || undefined,
      pendentesDeRegistro: f.pendentesDeRegistro || undefined,
    },
  });
  return data;
}

export async function resumoAgenda(): Promise<ResumoAgenda> {
  const { data } = await http.get<ResumoAgenda>('/compromissos/resumo');
  return data;
}

export async function buscarCompromisso(id: string): Promise<Compromisso> {
  const { data } = await http.get<Compromisso>(`/compromissos/${id}`);
  return data;
}

export async function criarCompromisso(payload: CompromissoPayload): Promise<Compromisso> {
  const { data } = await http.post<Compromisso>('/compromissos', payload);
  return data;
}

export async function atualizarCompromisso(
  id: string,
  payload: CompromissoPayload,
): Promise<Compromisso> {
  const { data } = await http.put<Compromisso>(`/compromissos/${id}`, payload);
  return data;
}

export async function definirStatusCompromisso(
  id: string,
  status: StatusCompromisso,
): Promise<Compromisso> {
  const { data } = await http.patch<Compromisso>(`/compromissos/${id}/status`, { status });
  return data;
}

/**
 * Remarcar arrastando — muda **só** o horário.
 *
 * Endpoint próprio, e não um PUT: a grade não tem por que devolver título,
 * pauta e lista de convidados para mover uma reunião meia hora, e reenviar
 * parcialmente apagaria em silêncio o que ficasse de fora.
 *
 * Em compromisso de dia inteiro o `fimEm` vai nulo — o servidor recalcula o
 * fecho do dia, para os dois lados não terem versões diferentes dessa conta.
 */
export async function moverCompromisso(
  id: string,
  inicioEm: string,
  fimEm: string | null,
): Promise<Compromisso> {
  const { data } = await http.patch<Compromisso>(`/compromissos/${id}/horario`, {
    inicioEm,
    fimEm,
  });
  return data;
}

export async function excluirCompromisso(id: string): Promise<void> {
  await http.delete(`/compromissos/${id}`);
}

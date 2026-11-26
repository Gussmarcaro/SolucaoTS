import { http } from './http';

export interface NotaRapida {
  id: string;
  texto: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** As notas do usuário logado, da mais recente para a mais antiga. */
export async function listarNotas(): Promise<NotaRapida[]> {
  const { data } = await http.get<NotaRapida[]>('/notas');
  return data;
}

export async function criarNota(texto = ''): Promise<NotaRapida> {
  const { data } = await http.post<NotaRapida>('/notas', { texto });
  return data;
}

export async function salvarNota(id: string, texto: string): Promise<NotaRapida> {
  const { data } = await http.put<NotaRapida>(`/notas/${id}`, { texto });
  return data;
}

export async function excluirNota(id: string): Promise<void> {
  await http.delete(`/notas/${id}`);
}

/** Quantas notas o usuário tem — só o número, para o contador do botão. */
export async function contarNotas(): Promise<number> {
  const { data } = await http.get<{ total: number }>('/notas/contagem');
  return data.total;
}

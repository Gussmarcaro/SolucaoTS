import { http } from './http';
import type { LoginPayload, LoginResposta } from '@/types/auth';

export async function login(payload: LoginPayload): Promise<LoginResposta> {
  const { data } = await http.post<LoginResposta>('/auth/login', payload);
  return data;
}

/** Solicita o e-mail de recuperação (resposta sempre genérica). */
export async function solicitarRecuperacao(email: string): Promise<{ message: string }> {
  const { data } = await http.post<{ message: string }>('/auth/esqueci-senha', { email });
  return data;
}

export async function redefinirSenha(params: {
  token: string;
  senha: string;
  confirmarSenha: string;
}): Promise<{ message: string }> {
  const { data } = await http.post<{ message: string }>('/auth/redefinir-senha', params);
  return data;
}

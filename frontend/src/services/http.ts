import axios from 'axios';
import { limparSessao, obterToken } from '@/lib/authStorage';

/** Cliente HTTP central da aplicação (base configurável via VITE_API_URL). */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Anexa o token JWT (Bearer) em toda requisição autenticada.
http.interceptors.request.use((config) => {
  const token = obterToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada/ inválida → limpa e redireciona ao login.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const noLogin = window.location.pathname.startsWith('/login');
      if (!noLogin) {
        limparSessao();
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Extrai a mensagem de erro amigável de uma resposta da API. */
export function extrairMensagemErro(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return fallback;
}

/** Código de negócio retornado pela API (ex.: DOCUMENTO_DUPLICADO). */
export function extrairCodigoErro(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) return error.response?.data?.code;
  return undefined;
}

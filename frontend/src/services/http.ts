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

  // Upload de arquivo: o Content-Type padrão precisa sair daqui.
  //
  // O axios olha o header ANTES de montar o corpo: vendo `application/json`
  // com um FormData, ele serializa o FormData em JSON (`formDataToJSON`) e o
  // arquivo simplesmente desaparece — o servidor recebe a requisição sem
  // `req.file` e responde "selecione o arquivo". Removendo o header, o axios
  // monta o multipart e escreve o boundary correto.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.setContentType(false);
  }

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

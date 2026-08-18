import type { UsuarioAutenticado } from '@/types/auth';

const TOKEN_KEY = '@SolucaoTS:token';
const USER_KEY = '@SolucaoTS:usuario';

/**
 * Persistência da sessão. Com "lembrar de mim" usamos localStorage (persiste
 * entre sessões); sem ele, sessionStorage (some ao fechar o navegador).
 */
function storageAtual(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(TOKEN_KEY)) return localStorage;
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
  return null;
}

export function salvarSessao(token: string, usuario: UsuarioAutenticado, lembrar: boolean): void {
  const store = lembrar ? localStorage : sessionStorage;
  const outro = lembrar ? sessionStorage : localStorage;
  outro.removeItem(TOKEN_KEY);
  outro.removeItem(USER_KEY);
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(usuario));
}

export function obterToken(): string | null {
  return storageAtual()?.getItem(TOKEN_KEY) ?? null;
}

export function obterUsuario(): UsuarioAutenticado | null {
  const raw = storageAtual()?.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as UsuarioAutenticado) : null;
}

/**
 * Substitui token e usuário mantendo o storage em uso.
 *
 * É o que a troca de órgão do suporte precisa: reemitir a credencial sem
 * decidir de novo entre "lembrar de mim" ou não — trocar de cliente atendido
 * não é um login novo, e mudar o storage aqui derrubaria a sessão de quem
 * havia marcado a opção.
 */
export function trocarSessao(token: string, usuario: UsuarioAutenticado): void {
  const store = storageAtual() ?? sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(usuario));
}

export function limparSessao(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

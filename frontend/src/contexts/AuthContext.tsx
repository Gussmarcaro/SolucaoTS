import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { limparSessao, obterToken, obterUsuario, salvarSessao, trocarSessao } from '@/lib/authStorage';
import type { UsuarioAutenticado } from '@/types/auth';

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  isAuthenticated: boolean;
  entrar: (token: string, usuario: UsuarioAutenticado, lembrar: boolean) => void;
  /** Adota um token novo sem refazer o login — a troca de órgão do suporte. */
  trocarOrgao: (token: string, usuario: UsuarioAutenticado) => void;
  /**
   * Atualiza os dados de exibição da sessão depois que o usuário edita o
   * próprio perfil. Não reemite o token — nome e e-mail nele só valem para a
   * autoria dos registros, e trocam no próximo login.
   */
  atualizarSessao: (parcial: Partial<UsuarioAutenticado>) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(() =>
    obterToken() ? obterUsuario() : null,
  );

  const entrar = useCallback(
    (token: string, user: UsuarioAutenticado, lembrar: boolean) => {
      salvarSessao(token, user, lembrar);
      setUsuario(user);
    },
    [],
  );

  const trocarOrgao = useCallback((token: string, user: UsuarioAutenticado) => {
    trocarSessao(token, user);
    setUsuario(user);
  }, []);

  const atualizarSessao = useCallback((parcial: Partial<UsuarioAutenticado>) => {
    setUsuario((atual) => {
      if (!atual) return atual;
      const novo = { ...atual, ...parcial };
      const token = obterToken();
      if (token) trocarSessao(token, novo);
      return novo;
    });
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, isAuthenticated: !!usuario, entrar, trocarOrgao, atualizarSessao, sair }),
    [usuario, entrar, trocarOrgao, atualizarSessao, sair],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

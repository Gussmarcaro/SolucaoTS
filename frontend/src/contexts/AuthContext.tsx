import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { limparSessao, obterToken, obterUsuario, salvarSessao, trocarSessao } from '@/lib/authStorage';
import { encerrarSessao } from '@/services/acessos.service';
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
    /*
     * Avisa o servidor **antes** de limpar a sessão — é o token que diz qual
     * sessão fechar, e depois do `limparSessao()` ele já não existe para ser
     * enviado.
     *
     * Sem `await`: o logout do navegador não pode ficar esperando a rede. O
     * pior caso é uma linha do histórico marcada como abandonada, e prender a
     * pessoa numa tela da qual ela pediu para sair seria pior que isso.
     * `encerrarSessao` engole a falha por essa razão.
     */
    void encerrarSessao();
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

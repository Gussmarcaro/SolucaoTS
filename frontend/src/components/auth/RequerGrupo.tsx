import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Compara nomes de grupo ignorando acento e caixa. */
const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Bloqueia a página para quem não é dos grupos informados.
 *
 * Esconder o item no menu não basta: sem isto, bastaria digitar a URL. Ainda
 * assim é a segunda linha — quem realmente barra é o backend, que devolve 403.
 *
 * Leva ao Dashboard em vez de mostrar um aviso de acesso restrito: para quem o
 * item nunca apareceu no menu, a tela simplesmente não existe, e explicar que
 * ela existe mas é proibida só informa o que não deveria ser procurado.
 */
export function RequerGrupo({ grupos, children }: { grupos: string[]; children: ReactNode }) {
  const { usuario } = useAuth();
  const permitidos = grupos.map(normalizar);
  const autorizado = !!usuario?.grupo && permitidos.includes(normalizar(usuario.grupo));

  return autorizado ? <>{children}</> : <Navigate to="/" replace />;
}

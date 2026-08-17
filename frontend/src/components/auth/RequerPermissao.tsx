import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissoes } from '@/contexts/PermissoesContext';

/**
 * Protege uma rota pela faixa de permissão do usuário.
 *
 * Quem não tem acesso é **levado ao Dashboard**, sem tela de aviso. O item já
 * não aparece no menu, então chegar aqui significa URL digitada, link antigo ou
 * favorito — e uma página de "acesso restrito" nesses casos só explica ao
 * usuário o que ele não deveria estar procurando. Silenciar é mais próximo de
 * "esta tela não existe para você".
 *
 * Isto é interface: quem barra de fato é o gate do servidor, que responde 403
 * mesmo se alguém chamar a API direto.
 */
export function RequerPermissao({ recurso, children }: { recurso: string; children: ReactNode }) {
  const { pode, carregando } = usePermissoes();

  // Enquanto as permissões não chegam, a interface assume acesso — o contrário
  // jogaria o usuário legítimo para fora da tela que ele acabou de abrir.
  if (carregando || pode(recurso, 'CONSULTA')) return <>{children}</>;

  return <Navigate to="/" replace />;
}

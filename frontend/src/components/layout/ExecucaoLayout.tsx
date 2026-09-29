import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AjusteExecucaoProvider } from '@/contexts/AjusteExecucaoContext';
import { ExigeAjuste } from './ExigeAjuste';
import { FaixaAjuste } from './FaixaAjuste';

/**
 * O envelope das telas de Execução: escolher a parceria vem antes de lançar.
 *
 * É rota de layout, e não um provider global, de propósito — quem nunca entra
 * na Execução não paga a consulta dos ajustes, e o contexto não existe onde não
 * significa nada (o Cadastro não executa parceria nenhuma).
 */
export function ExecucaoLayout() {
  const { usuario } = useAuth();
  return (
    <AjusteExecucaoProvider clienteId={usuario?.clienteId}>
      <ExigeAjuste>
        <FaixaAjuste />
        <Outlet />
      </ExigeAjuste>
    </AjusteExecucaoProvider>
  );
}

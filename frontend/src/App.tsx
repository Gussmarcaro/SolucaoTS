import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Login } from '@/pages/auth/Login';
import { EsqueciSenha } from '@/pages/auth/EsqueciSenha';
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha';
import { Dashboard } from '@/pages/Dashboard';
import { Ajustes } from '@/pages/Ajustes';
import { PrestacaoContas } from '@/pages/PrestacaoContas';
import { Usuarios } from '@/pages/Usuarios';
import { Empresas } from '@/pages/Empresas';
import { Entidades } from '@/pages/Entidades';
import { Placeholder } from '@/pages/Placeholder';

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas (sem layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Rotas protegidas (exigem sessão) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Cadastro */}
          <Route path="/cadastro/entidades" element={<Entidades />} />
          <Route path="/cadastro/ajustes" element={<Ajustes />} />
          <Route path="/cadastro/fornecedores" element={<Placeholder title="Fornecedores / Prestadores" />} />
          <Route path="/cadastro/contratos" element={<Placeholder title="Contratos Firmados" />} />
          <Route path="/cadastro/colaboradores" element={<Placeholder title="Colaboradores" />} />
          <Route path="/cadastro/bens-cedidos" element={<Placeholder title="Bens Cedidos" />} />
          <Route path="/cadastro/servidores-cedidos" element={<Placeholder title="Servidores Cedidos" />} />

          {/* Execução */}
          <Route path="/execucao/financeiro/contas-bancarias" element={<Placeholder title="Contas Bancárias" />} />
          <Route path="/execucao/financeiro/receitas" element={<Placeholder title="Receitas" />} />
          <Route path="/execucao/financeiro/despesas" element={<Placeholder title="Despesas" />} />
          <Route path="/execucao/financeiro/pagamentos" element={<Placeholder title="Pagamentos" />} />
          <Route path="/execucao/financeiro/rateio" element={<Placeholder title="Rateio Administrativo – Custos Indiretos" />} />
          <Route path="/execucao/financeiro/conciliacao" element={<Placeholder title="Conciliação Bancária" />} />
          <Route path="/execucao/tecnico" element={<Placeholder title="Técnico" />} />

          {/* Demais */}
          <Route path="/prestacao-contas" element={<PrestacaoContas />} />
          <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
          <Route path="/fiscalizacao" element={<Placeholder title="Fiscalização | Monitoramento" />} />
          <Route path="/transparencia" element={<Placeholder title="Transparência" />} />

          {/* Configurações */}
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/usuarios" element={<Usuarios />} />

          <Route path="*" element={<Placeholder title="Página não encontrada" />} />
        </Route>
      </Route>
    </Routes>
  );
}

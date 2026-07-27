import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Login } from '@/pages/auth/Login';
import { EsqueciSenha } from '@/pages/auth/EsqueciSenha';
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha';
import { Dashboard } from '@/pages/Dashboard';
import { Ajustes } from '@/pages/Ajustes';
import { PrestacaoContas } from '@/pages/PrestacaoContas';
import { Tarefas } from '@/pages/Tarefas';
import { Usuarios } from '@/pages/Usuarios';
import { Empresas } from '@/pages/Empresas';
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
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/prestacao-contas" element={<PrestacaoContas />} />
        <Route path="/tarefas" element={<Tarefas />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/entidades" element={<Placeholder title="Entidades" />} />
        <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
        <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
          <Route path="*" element={<Placeholder title="Página não encontrada" />} />
        </Route>
      </Route>
    </Routes>
  );
}

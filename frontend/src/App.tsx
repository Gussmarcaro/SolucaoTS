import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Login } from '@/pages/auth/Login';
import { EsqueciSenha } from '@/pages/auth/EsqueciSenha';
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha';
import { Dashboard } from '@/pages/Dashboard';
import { Ajustes } from '@/pages/Ajustes';
import { AjusteDetalhe } from '@/pages/Ajustes/AjusteDetalhe';
import { PrestacaoContas } from '@/pages/PrestacaoContas';
import { PrestacaoDetalhe } from '@/pages/PrestacaoContas/PrestacaoDetalhe';
import { Usuarios } from '@/pages/Usuarios';
import { Grupos } from '@/pages/Grupos';
import { Auditoria } from '@/pages/Auditoria';
import { RequerGrupo } from '@/components/auth/RequerGrupo';
import { RequerPermissao } from '@/components/auth/RequerPermissao';
import { GRUPOS_ADMIN } from '@/lib/navigation';
import { Orgaos } from '@/pages/Orgaos';
import { Empresas } from '@/pages/Empresas';
import { Entidades } from '@/pages/Entidades';
import { EntidadeDetalhe } from '@/pages/Entidades/EntidadeDetalhe';
import { Privacidade } from '@/pages/Privacidade';
import { Fornecedores } from '@/pages/Fornecedores';
import { Colaboradores } from '@/pages/Colaboradores';
import { Contratos } from '@/pages/Contratos';
import { BensCedidos } from '@/pages/BensCedidos';
import { ServidoresCedidos } from '@/pages/ServidoresCedidos';
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
          <Route
            path="/cadastro/entidades"
            element={
              <RequerPermissao recurso="CADASTRO_ENTIDADES">
                <Entidades />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/entidades/:id"
            element={
              <RequerPermissao recurso="CADASTRO_ENTIDADES">
                <EntidadeDetalhe />
              </RequerPermissao>
            }
          />
          <Route
            path="/privacidade"
            element={
              <RequerPermissao recurso="CONFIG_PRIVACIDADE">
                <Privacidade />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/ajustes"
            element={
              <RequerPermissao recurso="CADASTRO_AJUSTES">
                <Ajustes />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/ajustes/:id"
            element={
              <RequerPermissao recurso="CADASTRO_AJUSTES">
                <AjusteDetalhe />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/fornecedores"
            element={
              <RequerPermissao recurso="CADASTRO_FORNECEDORES">
                <Fornecedores />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/contratos"
            element={
              <RequerPermissao recurso="CADASTRO_CONTRATOS">
                <Contratos />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/colaboradores"
            element={
              <RequerPermissao recurso="CADASTRO_COLABORADORES">
                <Colaboradores />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/bens-cedidos"
            element={
              <RequerPermissao recurso="CADASTRO_BENS_CEDIDOS">
                <BensCedidos />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/servidores-cedidos"
            element={
              <RequerPermissao recurso="CADASTRO_SERVIDORES_CEDIDOS">
                <ServidoresCedidos />
              </RequerPermissao>
            }
          />

          {/* Execução */}
          <Route path="/execucao/financeiro/contas-bancarias" element={<Placeholder title="Contas Bancárias" />} />
          <Route path="/execucao/financeiro/receitas" element={<Placeholder title="Receitas" />} />
          <Route path="/execucao/financeiro/despesas" element={<Placeholder title="Despesas" />} />
          <Route path="/execucao/financeiro/pagamentos" element={<Placeholder title="Pagamentos" />} />
          <Route path="/execucao/financeiro/rateio" element={<Placeholder title="Rateio Administrativo – Custos Indiretos" />} />
          <Route path="/execucao/financeiro/conciliacao" element={<Placeholder title="Conciliação Bancária" />} />
          <Route path="/execucao/tecnico" element={<Placeholder title="Técnico" />} />

          {/* Demais */}
          <Route
            path="/prestacao-contas"
            element={
              <RequerPermissao recurso="PRESTACAO_CONTAS">
                <PrestacaoContas />
              </RequerPermissao>
            }
          />
          <Route
            path="/prestacao-contas/:id"
            element={
              <RequerPermissao recurso="PRESTACAO_CONTAS">
                <PrestacaoDetalhe />
              </RequerPermissao>
            }
          />
          <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
          <Route path="/fiscalizacao" element={<Placeholder title="Fiscalização | Monitoramento" />} />
          <Route path="/transparencia" element={<Placeholder title="Transparência" />} />

          {/* Configurações */}
          <Route
            path="/empresas"
            element={
              <RequerPermissao recurso="CADASTRO_EMPRESAS">
                <Empresas />
              </RequerPermissao>
            }
          />
          <Route
            path="/orgaos"
            element={
              <RequerPermissao recurso="CONFIG_ORGAOS">
                <Orgaos />
              </RequerPermissao>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RequerPermissao recurso="CONFIG_USUARIOS">
                <Usuarios />
              </RequerPermissao>
            }
          />
          <Route
            path="/grupos"
            element={
              <RequerPermissao recurso="CONFIG_GRUPOS">
                <Grupos />
              </RequerPermissao>
            }
          />
          <Route
            path="/auditoria"
            element={
              <RequerGrupo grupos={GRUPOS_ADMIN}>
                <RequerPermissao recurso="CONFIG_AUDITORIA">
                  <Auditoria />
                </RequerPermissao>
              </RequerGrupo>
            }
          />

          <Route path="*" element={<Placeholder title="Página não encontrada" />} />
        </Route>
      </Route>
    </Routes>
  );
}
